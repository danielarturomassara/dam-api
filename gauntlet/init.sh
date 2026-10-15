#!/usr/bin/env bash
# Installs the kit into a project, or verifies an installation.
#
#   bash gauntlet/init.sh [options]   install: copy every template file that is absent, write
#                                     gauntlet.json, render the dev container files, append the
#                                     gitignore entries, print the manual steps left. Never
#                                     overwrites an existing file; the one exception is
#                                     gauntlet.json, which gains project and service when the
#                                     dev container is added to an installed project
#   bash gauntlet/init.sh --check     the first gauntlet step: fail when a shim differs from its
#                                     template, a seed or generated file is missing, gauntlet.json
#                                     is missing or invalid, the git hook is not executable, or
#                                     core.hooksPath does not point at the kit
#
# Bash, not Node, on purpose: install runs on the host BEFORE the dev container exists, and the
# dev container is where Node lives. Everything else in the kit runs inside it or in CI and stays
# in Node. Written for bash 3.2 (what macOS ships): no associative arrays, no ${var,,}, no
# mapfile, and `${1+"$@"}` wherever "$@" may be empty (bash 3.2 reports a bare "$@" as unbound
# under `set -u`). Needs only POSIX awk, sed, find, sort and cmp, plus git for --check; on
# Windows it runs from Git Bash or WSL, and gauntlet/.gitattributes keeps the kit LF there.
#
# Install options. On a terminal init asks for whatever is missing; without one, every answer
# that has no safe default must be given (--project always; --stack unless exactly one is
# detected; --database for a server stack), the rest takes the printed recommendation:
#   --stack <name>                 hex-api | nestjs | nextjs | vite-react | vite-vue
#   --project <name>               the folder that holds the project's repositories (shop)
#   --service <name>               this repository's role inside it (api, app, admin)
#   --database <a,b|none>          databases to run next to the service (server stacks only)
#   --volume <a,b>                 selected databases that keep their data in a named volume
#   --shared | --isolated          one compose project for the sibling repositories, or one per
#                                  repository (shared is the recommendation)
#   --docker | --no-docker         force or skip the dev container files; by default they are
#                                  skipped when init already runs inside a container
# An option that cannot apply (a database for a client stack, a render option when the files
# already exist, a dev container option with --no-docker) is an error, never dropped.
#
# template/ mirrors a project root and holds two kinds of files:
# - SHIMS are byte-identical in every project because they only point at the kit: the workflows,
#   the Claude Code hooks wiring, the gauntlet command, the dependency-cruiser selector, and the
#   dev container file, which is rendered from the project and service names in gauntlet.json.
#   --check compares them — a drifted shim is a red gauntlet.
# - SEEDS are copied once and then owned by the project (thresholds, words, the agent prompt,
#   the testing rules, the code-style skill, the blank spec templates under spec/template/,
#   the feature lock). --check only requires them to exist.
# GENERATED files are rendered from the answers, never copied, then owned by the project:
# gauntlet.json, docker/compose.yml, docker/.env.dist (the last two always together).
# docker/.env is a local copy of .env.dist, gitignored, created when absent and never checked.
# Every template file must be listed in exactly one set; an unlisted file is a kit authoring
# error and fails loudly.
#
# Choosing the stack (only while gauntlet.json does not exist yet): --stack decides; otherwise
# the project is INSPECTED (package.json dependencies, next.config.*, nest-cli.json,
# vite.config.* and the Vite plugin the config text names). On a terminal every known stack is
# listed, detected ones first with their evidence; a single detected stack is the recommended
# default. Without a terminal exactly one detected stack is used, anything else stops.
# Detection is advice at install time; afterwards gauntlet.json is the truth, a conflicting
# option is an error, and --check only NOTES when the project no longer looks like its
# declaration. Any unknown argument is an error: this script never guesses what was meant.
#
# Every answer and derivation is resolved BEFORE the first write, so a refused answer, a closed
# prompt or a missing engines.node leaves the project untouched.
# Functions that can refuse call `fail` directly; those that hand a result back through a global
# (STACK, PLAN_*, PARSED, ...) are never run in a command substitution, where an exit would only
# end the child shell. Pure renderers print. The script runs only when executed directly; sourcing
# it loads the functions so they can be exercised without a terminal.
# cspell:ignore CDPATH bfnrt gsub SIGPIPE

set -eu
set -o pipefail
# A CDPATH entry holding another `gauntlet` directory would hijack the `cd` below and make the
# script read a different kit.
unset CDPATH
LC_ALL=C
export LC_ALL

KIT_DIRECTORY=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# gauntlet/init.sh → the project root is one level up. The kit always sits at
# <project root>/gauntlet, so this never depends on the current working directory.
PROJECT_ROOT=$(cd "$KIT_DIRECTORY/.." && pwd -P)
TEMPLATE_DIRECTORY="$KIT_DIRECTORY/template"
STACK_READER="$KIT_DIRECTORY/config/stack.cjs"
GIT_HOOK_DIRECTORY='gauntlet/hook/git'
GIT_PRE_PUSH_HOOK="$GIT_HOOK_DIRECTORY/pre-push"
# Lists are space-separated strings (bash 3.2 has no associative arrays and `set -u` trips on
# empty arrays); no entry ever contains a space.
# The stack list and the declaration keys mirror gauntlet/config/stack.cjs, the reader every
# Node consumer uses; assert_stack_lists_agree fails loudly when the two drift.
KNOWN_STACKS='hex-api nestjs nextjs vite-react vite-vue'
KNOWN_KEYS='project service stack'
SHIM_FILES='.claude/commands/gauntlet.md .claude/settings.json .dependency-cruiser.cjs .github/workflows/gauntlet.yml .github/workflows/protected-paths.yml'
SEED_FILES='.claude/agents/adversarial-reviewer.md .claude/rules/testing.md .claude/skills/code-style/SKILL.md cspell.json eslint.config.mjs spec/template/SPEC.template.md spec/template/context-map.template.md stryker.config.mjs vitest.config.ts'
DOCKER_SHIM_FILES='.devcontainer/devcontainer.json'
DOCKER_SEED_FILES='.devcontainer/devcontainer-lock.json'
DOCKER_COMPOSE_FILE='docker/compose.yml'
DOCKER_ENV_DIST_FILE='docker/.env.dist'
DOCKER_LOCAL_ENV_FILE='docker/.env'
DOCKER_GENERATED_FILES="$DOCKER_ENV_DIST_FILE $DOCKER_COMPOSE_FILE"
STACK_DECLARATION_FILE='gauntlet.json'
GITIGNORE_ENTRIES=".claude/settings.local.json .stryker-tmp/ $DOCKER_LOCAL_ENV_FILE report/"
NODE_API_MARKER_PACKAGES='@hapi/hapi express fastify inversify koa'
# Server stacks run next to a database; client stacks only run themselves.
DATABASE_STACKS='hex-api nestjs nextjs'
DATABASE_NAMES='mongodb postgresql mysql neo4j'
SERVICE_DEBUG_PORT=9229
# One row per technology the architecture supports, with each image's documented development
# conventions: name, version, user, password, port, data path, the compose keys the kit's
# service file reads from docker/.env (nothing else is rendered into .env.dist) and, for Neo4j,
# the HTTP port. The database the application connects to is the project's name — PostgreSQL
# and MySQL create it at first start, MongoDB on first write — except Neo4j Community, which has
# a single fixed database (database_name_for).
DATABASE_TABLE='
mongodb    8.2.2 root     example  27017 /data/db                 VERSION,USER,PASSWORD,PUBLIC_PORT
postgresql 18    postgres postgres 5432  /var/lib/postgresql/data VERSION,USER,PASSWORD,DATABASE,PUBLIC_PORT
mysql      9     root     root     3306  /var/lib/mysql           VERSION,PASSWORD,DATABASE,PUBLIC_PORT
neo4j      2025  neo4j    password 7687  /data                    VERSION,USER,PASSWORD,PUBLIC_PORT,PUBLIC_HTTP_PORT 7474
'

# ── helpers ─────────────────────────────────────────────────────────────────────────────────

log() { printf '%s\n' ${1+"$@"}; }
log_error() { printf '%s\n' ${1+"$@"} >&2; }

fail() {
  log_error "$1"
  exit 1
}

usage() {
  # shellcheck disable=SC2086
  log 'Usage:' \
    "  bash gauntlet/init.sh [--stack <$(join_with '|' $KNOWN_STACKS)>] [--project <name>] [--service <name>]" \
    "                        [--database <$(join_with ',' $DATABASE_NAMES)|none>] [--volume <names>] [--shared|--isolated] [--docker|--no-docker]" \
    '  bash gauntlet/init.sh --check'
}

fail_with_usage() {
  log_error "$1"
  usage >&2
  exit 1
}

list_contains() { # <list> <item>
  case " $1 " in
    *" $2 "*) return 0 ;;
    *) return 1 ;;
  esac
}

list_count() { # <list>
  local count=0 item

  for item in $1; do
    count=$((count + 1))
  done

  printf '%s' "$count"
}

list_item_at() { # <list> <1-based index>  — prints nothing when out of range
  local index=$2 item

  for item in $1; do
    if [ "$index" -eq 1 ]; then
      printf '%s' "$item"

      return 0
    fi

    index=$((index - 1))
  done

  return 0
}

join_with() { # <separator> items...
  local separator=$1 result='' item
  shift

  for item in ${1+"$@"}; do
    result="$result${result:+$separator}$item"
  done

  printf '%s' "$result"
}

trim() {
  local text=$1
  text=${text#"${text%%[![:space:]]*}"}
  text=${text%"${text##*[![:space:]]}"}
  printf '%s' "$text"
}

to_upper() { printf '%s' "$1" | tr '[:lower:]' '[:upper:]'; }

# Project and service names end up in container paths, volume names and compose project names:
# lower-case letters, digits and dashes, starting with a letter (NAME_PATTERN in stack.cjs).
is_valid_name() {
  case $1 in
    [a-z]*) [ -z "${1//[a-z0-9-]/}" ] ;;
    *) return 1 ;;
  esac
}

has_terminal() { [ -t 0 ] && [ -t 1 ]; }

is_inside_container() {
  [ -e /.dockerenv ] || [ -e /run/.containerenv ] || [ -n "${REMOTE_CONTAINERS:-}" ] ||
    [ -n "${DEVCONTAINER:-}" ] || [ -n "${CODESPACES:-}" ]
}

# Sets DB_NAME DB_VERSION DB_USER DB_PASSWORD DB_PORT DB_DATA_PATH DB_COMPOSE_KEYS DB_HTTP_PORT
# from the database table.
database_row() { # <name>
  local row
  row=$(printf '%s\n' "$DATABASE_TABLE" | awk -v name="$1" '$1 == name')
  [ -n "$row" ] || fail "Kit authoring error: unknown database \"$1\"."
  # shellcheck disable=SC2086
  set -- $row
  DB_NAME=$1
  DB_VERSION=$2
  DB_USER=$3
  DB_PASSWORD=$4
  DB_PORT=$5
  DB_DATA_PATH=$6
  DB_COMPOSE_KEYS=$(printf '%s' "$7" | tr ',' ' ')
  DB_HTTP_PORT=${8:-}
}

database_name_for() { # <database> <project>
  case $1 in
    neo4j) printf '%s' neo4j ;;
    *) printf '%s' "$2" ;;
  esac
}

service_name_for_stack() {
  case $1 in
    hex-api | nestjs) printf '%s' api ;;
    nextjs) printf '%s' app ;;
    vite-react | vite-vue) printf '%s' admin ;;
  esac
}

service_port_for_stack() {
  case $1 in
    hex-api | nestjs | nextjs) printf '%s' 3000 ;;
    vite-react | vite-vue) printf '%s' 5173 ;;
    *) fail "render_env_dist needs a known stack to pick the service port; got \"$1\"." ;;
  esac
}

# ── JSON (package.json and gauntlet.json; the one reader of this script) ────────────────────

# Prints one line per value, depth 1 and 2 only — nothing deeper is ever asked for:
#   <key><TAB><TAB><type><TAB><value>            a top-level value
#   <key><TAB><sub key><TAB><type><TAB><value>   a value one level down
# type is string (escapes kept as written), object, array or literal (number, true, false,
# null). A strict grammar check, as strict as JSON.parse in the Node consumers: a trailing
# comma, a missing colon or comma, a comment, a bad escape, a raw control character inside a
# string, text after the document or an empty file all exit 1, so --check refuses a file the
# later steps would throw on. Duplicate keys are kept in order; the readers below take the last
# one, like JSON.parse.
json_flatten() { # <file>
  awk '
    function emit(type, value) {
      if (depth == 1 && kind[1] == "{") {
        print key[1] "\t\t" type "\t" value
      } else if (depth == 2 && kind[1] == "{" && kind[2] == "{") {
        print key[1] "\t" key[2] "\t" type "\t" value
      }
    }

    function value_done() {
      expect = (depth == 0) ? "end" : "comma_or_end"
    }

    { text = text $0 "\n" }

    END {
      n = length(text)
      depth = 0
      expect = "value"

      for (i = 1; i <= n; i++) {
        c = substr(text, i, 1)

        if (c == " " || c == "\t" || c == "\n" || c == "\r") {
          continue
        }

        if (c == "\"") {
          value = ""

          for (i++; i <= n; i++) {
            c = substr(text, i, 1)

            if (c == "\"") {
              break
            }

            if (c < " ") {
              exit 1
            }

            if (c == "\\") {
              escaped = substr(text, i + 1, 1)

              if (escaped == "u") {
                if (substr(text, i + 2, 4) !~ /^[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]$/) {
                  exit 1
                }

                value = value c escaped substr(text, i + 2, 4)
                i += 5
                continue
              }

              if (escaped == "" || index("\"\\/bfnrt", escaped) == 0) {
                exit 1
              }

              value = value c escaped
              i++
              continue
            }

            value = value c
          }

          if (i > n) {
            exit 1
          }

          if (expect == "key" || expect == "key_or_end") {
            key[depth] = value
            expect = "colon"
          } else if (expect == "value" || expect == "value_or_end") {
            emit("string", value)
            value_done()
          } else {
            exit 1
          }

          continue
        }

        if (c == ":") {
          if (expect != "colon") {
            exit 1
          }

          expect = "value"
          continue
        }

        if (c == ",") {
          if (expect != "comma_or_end") {
            exit 1
          }

          expect = (kind[depth] == "{") ? "key" : "value"
          continue
        }

        if (c == "{" || c == "[") {
          if (expect != "value" && expect != "value_or_end") {
            exit 1
          }

          emit(c == "{" ? "object" : "array", "")
          depth++
          kind[depth] = c
          key[depth] = ""
          expect = (c == "{") ? "key_or_end" : "value_or_end"
          continue
        }

        if (c == "}" || c == "]") {
          if (depth == 0 || kind[depth] != (c == "}" ? "{" : "[")) {
            exit 1
          }

          if (expect != "comma_or_end" && expect != (c == "}" ? "key_or_end" : "value_or_end")) {
            exit 1
          }

          depth--
          value_done()
          continue
        }

        if (expect != "value" && expect != "value_or_end") {
          exit 1
        }

        value = c

        for (i++; i <= n; i++) {
          c = substr(text, i, 1)

          if (c == "," || c == "}" || c == "]" || c == " " || c == "\t" || c == "\n" || c == "\r") {
            i--
            break
          }

          value = value c
        }

        if (value !~ /^(true|false|null|-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?)$/) {
          exit 1
        }

        emit("literal", value)
        value_done()
      }

      if (expect != "end") {
        exit 1
      }
    }
  ' "$1"
}

# The readers read their input to the end: an early `exit` could leave printf with unsent data
# and turn the pipeline status into SIGPIPE under pipefail.
json_value() { # <flattened> <key> [sub key]  — the raw value of the last occurrence, empty when absent
  printf '%s\n' "$1" | awk -F '\t' -v key="$2" -v sub_key="${3:-}" '$1 == key && $2 == sub_key { value = $4; found = 1 } END { if (found) print value }'
}

json_has_key() { # <flattened> <key>
  printf '%s\n' "$1" | awk -F '\t' -v key="$2" '$1 == key && $2 == "" { found = 1 } END { exit found ? 0 : 1 }'
}

json_keys() { # <flattened>  — the top-level keys, one per line, each once
  printf '%s\n' "$1" | awk -F '\t' '$2 == "" && $1 != "" && !seen[$1]++ { print $1 }'
}

# ── arguments ───────────────────────────────────────────────────────────────────────────────

OPTION_CHECK=0
OPTION_STACK=''
OPTION_PROJECT=''
OPTION_SERVICE=''
OPTION_DATABASES=''
OPTION_DATABASES_GIVEN=0
OPTION_VOLUMES=''
OPTION_VOLUMES_GIVEN=0
OPTION_SHARED=''
OPTION_DOCKER=''

take_value() { # <flag> [value...]  → VALUE
  if [ $# -lt 2 ] || [ "${2#--}" != "$2" ]; then
    fail_with_usage "$1 needs a value."
  fi

  VALUE=$2
}

parse_name_list() { # <raw list> <flag>  → PARSED (space-separated, first occurrence kept)
  local raw=$1 flag=$2 remainder token names='' count=0 unknown=0 or_none=''

  if [ "$raw" = none ]; then
    PARSED=''

    return 0
  fi

  remainder="$raw,"

  while [ -n "$remainder" ]; do
    token=$(trim "${remainder%%,*}")
    remainder=${remainder#*,}
    [ -n "$token" ] || continue
    count=$((count + 1))
    list_contains "$DATABASE_NAMES" "$token" || unknown=1
    list_contains "$names" "$token" || names="$names${names:+ }$token"
  done

  if [ "$count" -eq 0 ] || [ "$unknown" -eq 1 ]; then
    [ "$flag" != --database ] || or_none=', or none'
    # shellcheck disable=SC2086
    fail_with_usage "$flag takes a comma-separated list of $(join_with ', ' $DATABASE_NAMES)$or_none; got \"$raw\"."
  fi

  PARSED=$names
}

has_devcontainer_option() {
  [ "$OPTION_DATABASES_GIVEN" -eq 1 ] || [ -n "$OPTION_PROJECT" ] || [ -n "$OPTION_SERVICE" ] ||
    [ -n "$OPTION_SHARED" ] || [ "$OPTION_VOLUMES_GIVEN" -eq 1 ]
}

has_render_option() {
  [ "$OPTION_DATABASES_GIVEN" -eq 1 ] || [ -n "$OPTION_SHARED" ] || [ "$OPTION_VOLUMES_GIVEN" -eq 1 ]
}

has_any_install_option() {
  has_devcontainer_option || [ -n "$OPTION_DOCKER" ] || [ -n "$OPTION_STACK" ]
}

parse_arguments() {
  local name

  while [ $# -gt 0 ]; do
    case $1 in
      --check)
        OPTION_CHECK=1
        ;;
      --stack)
        take_value "$@"
        OPTION_STACK=$VALUE
        shift

        if ! list_contains "$KNOWN_STACKS" "$OPTION_STACK"; then
          # shellcheck disable=SC2086
          fail_with_usage "Unknown stack \"$OPTION_STACK\". Known stacks: $(join_with ', ' $KNOWN_STACKS)."
        fi
        ;;
      --project | --service)
        take_value "$@"

        if ! is_valid_name "$VALUE"; then
          fail_with_usage "$1 \"$VALUE\" must be lower-case letters, digits and dashes, starting with a letter."
        fi

        if [ "$1" = --project ]; then
          OPTION_PROJECT=$VALUE
        else
          OPTION_SERVICE=$VALUE
        fi

        shift
        ;;
      --database)
        take_value "$@"
        parse_name_list "$VALUE" "$1"
        OPTION_DATABASES=$PARSED
        OPTION_DATABASES_GIVEN=1
        shift
        ;;
      --volume)
        take_value "$@"
        parse_name_list "$VALUE" "$1"
        OPTION_VOLUMES=$PARSED
        OPTION_VOLUMES_GIVEN=1
        shift
        ;;
      --shared)
        OPTION_SHARED=true
        ;;
      --isolated)
        OPTION_SHARED=false
        ;;
      --docker)
        OPTION_DOCKER=true
        ;;
      --no-docker)
        OPTION_DOCKER=false
        ;;
      *)
        fail_with_usage "Unknown argument \"$1\"."
        ;;
    esac

    shift
  done

  if [ "$OPTION_CHECK" -eq 1 ] && has_any_install_option; then
    fail_with_usage '--check takes no other option: everything is read from gauntlet.json.'
  fi

  if [ "$OPTION_VOLUMES_GIVEN" -eq 1 ] && [ "$OPTION_DATABASES_GIVEN" -eq 0 ]; then
    fail_with_usage '--volume needs --database to say which databases run at all.'
  fi

  for name in $OPTION_VOLUMES; do
    if ! list_contains "$OPTION_DATABASES" "$name"; then
      fail_with_usage '--volume names a database that --database did not select.'
    fi
  done

  if [ "$OPTION_DOCKER" = false ] && has_devcontainer_option; then
    fail_with_usage '--no-docker excludes --project, --service, --database, --volume, --shared and --isolated.'
  fi
}

# ── kit bookkeeping ─────────────────────────────────────────────────────────────────────────

list_template_files() { # → TEMPLATE_FILES (relative paths, byte order)
  TEMPLATE_FILES=$(cd "$TEMPLATE_DIRECTORY" && find . -type f | sed 's|^\./||' | sort | tr '\n' ' ')
}

assert_template_is_classified() {
  local classified="$SHIM_FILES $SEED_FILES $DOCKER_SHIM_FILES $DOCKER_SEED_FILES" file unlisted='' absent=''

  for file in $TEMPLATE_FILES; do
    list_contains "$classified" "$file" || unlisted="$unlisted $file"
  done

  for file in $classified; do
    list_contains "$TEMPLATE_FILES" "$file" || absent="$absent $file"
  done

  if [ -z "$unlisted$absent" ]; then
    return 0
  fi

  log_error 'Kit authoring error: gauntlet/template/ and the file lists in init.sh disagree.'

  for file in $unlisted; do
    log_error "  template file not listed as shim or seed: $file"
  done

  for file in $absent; do
    log_error "  listed but absent from template/: $file"
  done

  exit 1
}

# The Node consumers read the stack list from gauntlet/config/stack.cjs; this script cannot
# import it, so it carries a copy and verifies the copy on every run.
assert_stack_lists_agree() {
  local declared
  declared=$(sed -n 's/^const KNOWN_STACKS = \[\(.*\)\];$/\1/p' "$STACK_READER" | tr -d "' " | tr ',' ' ')

  if [ "$declared" != "$KNOWN_STACKS" ]; then
    fail "Kit authoring error: KNOWN_STACKS in gauntlet/init.sh ($KNOWN_STACKS) and in gauntlet/config/stack.cjs (${declared:-unreadable}) disagree."
  fi
}

# ── the declaration (mirrors gauntlet/config/stack.cjs) ─────────────────────────────────────

# Sets DECLARED_PROJECT, DECLARED_SERVICE, DECLARED_STACK (project and service empty when the
# repository has no dev container) or DECLARATION_ERROR, the one line that explains why the
# file is unusable. Never exits: install fails on the error, --check lists it as a problem.
read_declaration() {
  local path="$PROJECT_ROOT/$STACK_DECLARATION_FILE" flat key unknown_keys='' has_project=0 has_service=0 name_key name
  DECLARATION_ERROR=''
  DECLARED_PROJECT=''
  DECLARED_SERVICE=''
  DECLARED_STACK=''

  if [ ! -e "$path" ]; then
    DECLARATION_ERROR="gauntlet.json not found at $path. Run \`bash gauntlet/init.sh\` once per project."

    return 0
  fi

  if ! flat=$(json_flatten "$path"); then
    DECLARATION_ERROR='gauntlet.json is not valid JSON.'

    return 0
  fi

  while IFS= read -r key; do
    [ -n "$key" ] || continue
    list_contains "$KNOWN_KEYS" "$key" || unknown_keys="$unknown_keys${unknown_keys:+, }$key"
  done <<EOF
$(json_keys "$flat")
EOF

  if [ -n "$unknown_keys" ]; then
    # shellcheck disable=SC2086
    DECLARATION_ERROR="gauntlet.json has unknown key(s) $unknown_keys. Known keys: $(join_with ', ' $KNOWN_KEYS)."

    return 0
  fi

  if json_has_key "$flat" stack; then
    DECLARED_STACK=$(json_value "$flat" stack)
  else
    DECLARED_STACK=undefined
  fi

  if ! list_contains "$KNOWN_STACKS" "$DECLARED_STACK"; then
    # shellcheck disable=SC2086
    DECLARATION_ERROR="gauntlet.json declares unknown stack \"$DECLARED_STACK\". Known stacks: $(join_with ', ' $KNOWN_STACKS)."
    DECLARED_STACK=''

    return 0
  fi

  json_has_key "$flat" project && has_project=1
  json_has_key "$flat" service && has_service=1

  if [ "$has_project" -ne "$has_service" ]; then
    DECLARATION_ERROR='gauntlet.json must declare project and service together, or neither when the repository has no dev container.'
    DECLARED_STACK=''

    return 0
  fi

  for name_key in project service; do
    if [ "$has_project" -eq 1 ]; then
      name=$(json_value "$flat" "$name_key")

      if ! is_valid_name "$name"; then
        DECLARATION_ERROR="gauntlet.json: $name_key \"$name\" must be lower-case letters, digits and dashes, starting with a letter."
        DECLARED_STACK=''

        return 0
      fi
    fi
  done

  if [ "$has_project" -eq 1 ]; then
    DECLARED_PROJECT=$(json_value "$flat" project)
    DECLARED_SERVICE=$(json_value "$flat" service)
  fi
}

# ── project inspection ──────────────────────────────────────────────────────────────────────

PACKAGE_JSON_READ=0
PACKAGE_JSON_FLAT=''
DEPENDENCY_NAMES=''
DETECTED_STACKS=''

read_package_json() { # → PACKAGE_JSON_FLAT (empty when the file does not exist)
  [ "$PACKAGE_JSON_READ" -eq 0 ] || return 0
  PACKAGE_JSON_READ=1

  if [ -e "$PROJECT_ROOT/package.json" ]; then
    PACKAGE_JSON_FLAT=$(json_flatten "$PROJECT_ROOT/package.json") || fail 'package.json is not valid JSON.'
  fi
}

has_dependency() { list_contains "$DEPENDENCY_NAMES" "$1"; }

find_existing_file() { # names...  — prints the first that exists, nothing otherwise
  local name

  for name in ${1+"$@"}; do
    if [ -e "$PROJECT_ROOT/$name" ]; then
      printf '%s' "$name"

      return 0
    fi
  done

  return 0
}

# The whole text is one string, so the pattern (an awk ERE) sees line breaks as characters.
file_matches() { # <file> <pattern>
  awk -v pattern="$2" '{ text = text $0 "\n" } END { exit (text ~ pattern) ? 0 : 1 }' "$1"
}

# Evidence per stack lives in EVIDENCE_<stack with dashes as underscores>, joined with "; ";
# DETECTED_STACKS keeps the detection order.
add_evidence() { # <stack> <evidence>
  local variable_name="EVIDENCE_${1//-/_}" existing=''

  if list_contains "$DETECTED_STACKS" "$1"; then
    existing="${!variable_name}; "
  else
    DETECTED_STACKS="$DETECTED_STACKS${DETECTED_STACKS:+ }$1"
  fi

  printf -v "$variable_name" '%s' "$existing$2"
}

evidence_for() { # <stack>
  local variable_name="EVIDENCE_${1//-/_}"
  printf '%s' "${!variable_name}"
}

describe_evidence() { # <stack>
  printf '%s (%s)' "$1" "$(evidence_for "$1")"
}

describe_detected_stacks() { # <separator>
  local separator=$1 stack result=''

  for stack in $DETECTED_STACKS; do
    result="$result${result:+$separator}$(describe_evidence "$stack")"
  done

  printf '%s' "$result"
}

# Sets DETECTED_STACKS and the evidence: every stack the project shows signs of, with the signs.
# hex-api is BY DEFINITION the framework-less Node API: an HTTP library or a DI container and no
# framework sign at all. Not a fallback — a project with a framework sign is reported as that
# framework (or as several), never as hex-api.
inspect_project() {
  local config_file markers='' name
  DETECTED_STACKS=''
  read_package_json
  DEPENDENCY_NAMES=$(printf '%s\n' "$PACKAGE_JSON_FLAT" |
    awk -F '\t' '($1 == "dependencies" || $1 == "devDependencies") && $2 != "" { print $2 }' | tr '\n' ' ')

  if has_dependency '@nestjs/core'; then
    add_evidence nestjs 'dependency @nestjs/core'
  fi

  if has_dependency next; then
    add_evidence nextjs 'dependency next'
  fi

  config_file=$(find_existing_file nest-cli.json)
  [ -z "$config_file" ] || add_evidence nestjs "file $config_file"
  config_file=$(find_existing_file next.config.js next.config.mjs next.config.ts next.config.cjs)
  [ -z "$config_file" ] || add_evidence nextjs "file $config_file"
  config_file=$(find_existing_file vite.config.js vite.config.mjs vite.config.ts vite.config.mts vite.config.cjs vite.config.cts)

  if [ -n "$config_file" ]; then
    if file_matches "$PROJECT_ROOT/$config_file" '@vitejs/plugin-react(-swc)?[^A-Za-z0-9_]'; then
      add_evidence vite-react "$config_file names @vitejs/plugin-react"
    fi

    if file_matches "$PROJECT_ROOT/$config_file" '@vitejs/plugin-vue[^A-Za-z0-9_]'; then
      add_evidence vite-vue "$config_file names @vitejs/plugin-vue"
    fi
  fi

  if has_dependency vite; then
    if has_dependency react; then
      add_evidence vite-react 'dependencies vite + react'
    fi

    if has_dependency vue; then
      add_evidence vite-vue 'dependencies vite + vue'
    fi
  fi

  if [ -z "$DETECTED_STACKS" ]; then
    for name in $NODE_API_MARKER_PACKAGES; do
      if has_dependency "$name"; then
        markers="$markers${markers:+, }$name"
      fi
    done

    [ -z "$markers" ] || add_evidence hex-api "dependencies $markers and no framework sign"
  fi

  return 0
}

# The dev container's Node image follows engines.node: the lower bound's major, as its alpine
# tag. Upper bounds (`<27`) are ignored, so a range with no lower bound is an error, like a
# missing field — the container and CI must agree on the version, and CI reads this field.
derive_node_version() { # <engines.node>  → NODE_VERSION
  local major
  major=$(printf '%s' "$1" | sed -E 's/<=?[[:space:]]*[0-9]+(\.[0-9]+)*//g' | sed -nE 's/^[^0-9]*([0-9]+).*$/\1/p')

  if [ -z "$major" ]; then
    fail 'package.json must declare engines.node with a lower bound (e.g. ">=26 <27") — the dev container derives its Node image from it.'
  fi

  NODE_VERSION="$major-alpine"
}

# ── prompts (terminal only) ─────────────────────────────────────────────────────────────────

# A prompt whose input closes (Ctrl-D, a dropped terminal) fails instead of hanging, before
# anything was written.
ask() { # <question>  → ANSWER
  printf '%s' "$1"

  if ! IFS= read -r ANSWER; then
    printf '\n'
    fail 'Input closed before the questions were answered — nothing was written.'
  fi
}

# Asks until the parser accepts the answer. A parser gets the raw answer as its last argument,
# sets PARSED and returns 1 for anything it cannot read.
ask_until_valid() { # <question> <parser> [parser arguments...]
  local question=$1
  shift

  while :; do
    ask "$question"

    if "$@" "$ANSWER"; then
      return 0
    fi

    log 'Not a valid answer.'
  done
}

parse_name_answer() { # <default or empty> <answer>
  local answer
  answer=$(trim "$2")

  if [ -z "$answer" ]; then
    [ -n "$1" ] || return 1
    PARSED=$1

    return 0
  fi

  is_valid_name "$answer" || return 1
  PARSED=$answer
}

ask_name() { # <label> <default or empty>  → PARSED
  local question=$1
  [ -z "$2" ] || question="$question [$2]"
  ask_until_valid "$question: " parse_name_answer "$2"
}

parse_yes_no() { # <default true|false> <answer>
  local answer
  answer=$(trim "$2" | tr '[:upper:]' '[:lower:]')

  case $answer in
    '') PARSED=$1 ;;
    y | yes) PARSED=true ;;
    n | no) PARSED=false ;;
    *) return 1 ;;
  esac
}

# Detected stacks first, in detection order, then the rest in the kit's order. One detected
# stack is the recommended default; zero or several mean no default.
build_stack_menu() { # → MENU_ORDERED_STACKS, MENU_DEFAULT_STACK
  local stack
  MENU_ORDERED_STACKS=$DETECTED_STACKS
  MENU_DEFAULT_STACK=''

  for stack in $KNOWN_STACKS; do
    list_contains "$DETECTED_STACKS" "$stack" || MENU_ORDERED_STACKS="$MENU_ORDERED_STACKS${MENU_ORDERED_STACKS:+ }$stack"
  done

  if [ "$(list_count "$DETECTED_STACKS")" -eq 1 ]; then
    MENU_DEFAULT_STACK=$DETECTED_STACKS
  fi
}

print_stack_menu() {
  local stack index=0 detected_text recommended_text
  log 'Which stack is this project?'

  for stack in $MENU_ORDERED_STACKS; do
    index=$((index + 1))
    detected_text=''
    recommended_text=''

    if list_contains "$DETECTED_STACKS" "$stack"; then
      detected_text="  detected: $(evidence_for "$stack")"
    fi

    [ "$stack" != "$MENU_DEFAULT_STACK" ] || recommended_text='  (recommended)'
    printf '  %d) %-11s%s%s\n' "$index" "$stack" "$detected_text" "$recommended_text"
  done

  if [ "$(list_count "$DETECTED_STACKS")" -gt 1 ]; then
    log '  Several stacks detected — no default, pick one.'
  fi
}

# Empty answer takes the default when there is one; a number picks from the menu; a known
# stack name is accepted as typed.
parse_stack_answer() { # <answer>
  local answer
  answer=$(trim "$1")

  if [ -z "$answer" ]; then
    [ -n "$MENU_DEFAULT_STACK" ] || return 1
    PARSED=$MENU_DEFAULT_STACK

    return 0
  fi

  case $answer in
    *[!0-9]*)
      list_contains "$KNOWN_STACKS" "$answer" || return 1
      PARSED=$answer
      ;;
    *)
      [ ${#answer} -le 9 ] || return 1
      PARSED=$(list_item_at "$MENU_ORDERED_STACKS" "$((10#$answer))")
      [ -n "$PARSED" ]
      ;;
  esac
}

# Comma-separated numbers or names out of the database list; empty means none.
parse_database_answer() { # <answer>
  local remainder="$1," token name names=''

  while [ -n "$remainder" ]; do
    token=$(trim "${remainder%%,*}")
    remainder=${remainder#*,}
    [ -n "$token" ] || continue

    case $token in
      *[!0-9]*)
        name=$token
        ;;
      *)
        [ ${#token} -le 9 ] || return 1
        name=$(list_item_at "$DATABASE_NAMES" "$((10#$token))")
        ;;
    esac

    list_contains "$DATABASE_NAMES" "$name" || return 1
    list_contains "$names" "$name" || names="$names${names:+ }$name"
  done

  PARSED=$names
}

# ── choosing the stack ──────────────────────────────────────────────────────────────────────

resolve_stack() { # <requested stack or empty>  → STACK
  local count

  if [ -e "$PROJECT_ROOT/$STACK_DECLARATION_FILE" ]; then
    if [ -n "$1" ] && [ "$1" != "$DECLARED_STACK" ]; then
      fail "gauntlet.json already declares \"$DECLARED_STACK\"; --stack $1 conflicts with it. The declaration is protected — change it deliberately, not by re-running init."
    fi

    STACK=$DECLARED_STACK

    return 0
  fi

  if [ -n "$1" ]; then
    STACK=$1

    return 0
  fi

  inspect_project
  count=$(list_count "$DETECTED_STACKS")

  if has_terminal; then
    build_stack_menu
    print_stack_menu
    ask_until_valid "Stack${MENU_DEFAULT_STACK:+ [$MENU_DEFAULT_STACK]}: " parse_stack_answer
    STACK=$PARSED

    return 0
  fi

  if [ "$count" -eq 1 ]; then
    log "Detected stack: $(describe_evidence "$DETECTED_STACKS")."
    STACK=$DETECTED_STACKS

    return 0
  fi

  if [ "$count" -eq 0 ]; then
    log_error 'Could not detect the stack: no package.json dependency or framework config file matched.'
  else
    log_error "Ambiguous stack: $(describe_detected_stacks ', ')."
  fi

  # shellcheck disable=SC2086
  fail "No terminal to ask on. Pass --stack <$(join_with '|' $KNOWN_STACKS)>."
}

# ── dev container: answers ──────────────────────────────────────────────────────────────────

# The project is the folder that holds the sibling repositories; on the host that is the
# parent of this repository. Inside a container the parent is the mount root, which is no
# recommendation at all. A recommendation is shown on a terminal only — without one the name
# must be given, because a guessed folder name would be baked into container, volume and
# compose project names.
recommend_project_name() {
  local parent_name
  parent_name=$(basename "$(dirname "$PROJECT_ROOT")")

  if ! is_inside_container && is_valid_name "$parent_name"; then
    printf '%s' "$parent_name"
  fi

  return 0
}

resolve_project_and_service() { # → PLAN_PROJECT, PLAN_SERVICE
  local recommended_service recommended_project

  if [ -n "$EXISTING_PROJECT" ]; then
    if [ -n "$OPTION_PROJECT" ] && [ "$OPTION_PROJECT" != "$EXISTING_PROJECT" ]; then
      fail "gauntlet.json already declares project \"$EXISTING_PROJECT\"; --project $OPTION_PROJECT conflicts with it."
    fi

    if [ -n "$OPTION_SERVICE" ] && [ "$OPTION_SERVICE" != "$EXISTING_SERVICE" ]; then
      fail "gauntlet.json already declares service \"$EXISTING_SERVICE\"; --service $OPTION_SERVICE conflicts with it."
    fi

    PLAN_PROJECT=$EXISTING_PROJECT
    PLAN_SERVICE=$EXISTING_SERVICE

    return 0
  fi

  recommended_service=$(service_name_for_stack "$STACK")

  if [ -n "$OPTION_PROJECT" ] && [ -n "$OPTION_SERVICE" ]; then
    PLAN_PROJECT=$OPTION_PROJECT
    PLAN_SERVICE=$OPTION_SERVICE

    return 0
  fi

  if has_terminal; then
    if [ -n "$OPTION_PROJECT" ]; then
      PLAN_PROJECT=$OPTION_PROJECT
    else
      recommended_project=$(recommend_project_name)
      ask_name "Project name (the folder holding this project's repositories)" "$recommended_project"
      PLAN_PROJECT=$PARSED
    fi

    if [ -n "$OPTION_SERVICE" ]; then
      PLAN_SERVICE=$OPTION_SERVICE
    else
      ask_name 'Service name of this repository' "$recommended_service"
      PLAN_SERVICE=$PARSED
    fi

    return 0
  fi

  if [ -z "$OPTION_PROJECT" ]; then
    fail "No terminal to ask on. Pass --project <name> (the folder holding this project's repositories); --service defaults to $recommended_service for $STACK."
  fi

  log "Project: $OPTION_PROJECT, service: $recommended_service (recommended for $STACK)."
  PLAN_PROJECT=$OPTION_PROJECT
  PLAN_SERVICE=$recommended_service
}

resolve_databases() { # → PLAN_DATABASES, PLAN_VOLUMES (the selected ones that keep a volume)
  local index=0 name
  PLAN_DATABASES=''
  PLAN_VOLUMES=''

  if ! list_contains "$DATABASE_STACKS" "$STACK"; then
    if [ "$OPTION_DATABASES_GIVEN" -eq 1 ] || [ "$OPTION_VOLUMES_GIVEN" -eq 1 ]; then
      fail "$STACK is a client stack and runs no database: drop --database and --volume."
    fi

    return 0
  fi

  if [ "$OPTION_DATABASES_GIVEN" -eq 1 ]; then
    PLAN_DATABASES=$OPTION_DATABASES
    PLAN_VOLUMES=$OPTION_VOLUMES

    return 0
  fi

  if ! has_terminal; then
    # shellcheck disable=SC2086
    fail "No terminal to ask on. Pass --database <$(join_with ',' $DATABASE_NAMES)|none> (and --volume <names> for persistent data)."
  fi

  log 'Databases to run next to the service (comma-separated numbers or names, Enter for none):'

  for name in $DATABASE_NAMES; do
    index=$((index + 1))
    log "  $index) $name"
  done

  ask_until_valid 'Databases: ' parse_database_answer
  PLAN_DATABASES=$PARSED

  for name in $PLAN_DATABASES; do
    ask_until_valid "Keep $name data in a named volume? [y/N]: " parse_yes_no false
    [ "$PARSED" != true ] || PLAN_VOLUMES="$PLAN_VOLUMES${PLAN_VOLUMES:+ }$name"
  done

  return 0
}

resolve_shared() { # → PLAN_SHARED (true|false)
  if [ -n "$OPTION_SHARED" ]; then
    PLAN_SHARED=$OPTION_SHARED

    return 0
  fi

  if ! has_terminal; then
    log "Compose project shared with the sibling repositories of $PLAN_PROJECT (recommended; pass --isolated for one per repository)."
    PLAN_SHARED=true

    return 0
  fi

  ask_until_valid "Do sibling repositories of $PLAN_PROJECT run alongside this one on the same network? [Y/n]: " parse_yes_no true
  PLAN_SHARED=$PARSED
}

# Everything the dev container files need, resolved before any write. PLAN_RENDER is 0 when
# compose.yml and .env.dist already exist: they are kept, and render options are refused.
plan_devcontainer() {
  local compose_exists=0 env_dist_exists=0 missing_file
  resolve_project_and_service
  [ ! -e "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" ] || compose_exists=1
  [ ! -e "$PROJECT_ROOT/$DOCKER_ENV_DIST_FILE" ] || env_dist_exists=1

  if [ "$compose_exists" -ne "$env_dist_exists" ]; then
    missing_file=$DOCKER_COMPOSE_FILE
    [ "$compose_exists" -eq 0 ] || missing_file=$DOCKER_ENV_DIST_FILE
    fail "$DOCKER_COMPOSE_FILE and $DOCKER_ENV_DIST_FILE are rendered together, but $missing_file is missing. Restore it, or remove the other to render both again."
  fi

  if [ "$compose_exists" -eq 1 ]; then
    if has_render_option; then
      fail "$DOCKER_COMPOSE_FILE and $DOCKER_ENV_DIST_FILE exist and are kept; --database, --volume, --shared and --isolated only apply when they are rendered. Remove both to render them again."
    fi

    PLAN_RENDER=0
    PLAN_DATABASES=''
    PLAN_VOLUMES=''

    return 0
  fi

  resolve_databases
  resolve_shared
  read_package_json
  derive_node_version "$(json_value "$PACKAGE_JSON_FLAT" engines node)"
  PLAN_NODE_VERSION=$NODE_VERSION
  PLAN_SERVICE_PORT=$(service_port_for_stack "$STACK")
  PLAN_RENDER=1
}

# ── dev container: rendering (pure, print to stdout) ────────────────────────────────────────

# In bash rather than sed so the output is the template byte for byte apart from the two names:
# BSD sed would add a final newline the template may not have, and --check compares bytes.
render_devcontainer() { # <template file> <project> <service>
  local text
  text=$(cat "$1"; printf x)
  text=${text%x}
  text=${text//'{{project}}'/$2}
  text=${text//'{{service}}'/$3}
  printf '%s' "$text"
}

render_compose() {
  local name volume_names=''
  log "# Rendered by gauntlet/init.sh from the project's answers; owned by the project afterwards." \
    '# Service definitions live in gauntlet/docker/service/ and are shared through `extends`; every' \
    '# variable comes from docker/.env (copy of docker/.env.dist). The build location is restated' \
    '# under the service so it is unambiguous whichever way Compose resolves an extended path.' \
    'services:' \
    "  $PLAN_SERVICE:" \
    '    extends:' \
    '      file: ../gauntlet/docker/service/app.yml' \
    '      service: app' \
    '    build:' \
    '      context: ../gauntlet/docker' \
    '      dockerfile: Dockerfile'

  if [ -n "$PLAN_DATABASES" ]; then
    log '    depends_on:'

    for name in $PLAN_DATABASES; do
      log "      $name:" '        condition: service_healthy'
    done
  fi

  for name in $PLAN_DATABASES; do
    log "  $name:" '    extends:' "      file: ../gauntlet/docker/service/$name.yml" "      service: $name"

    if list_contains "$PLAN_VOLUMES" "$name"; then
      database_row "$name"
      log '    volumes:' "      - $name-data:$DB_DATA_PATH"
      volume_names="$volume_names${volume_names:+ }$name-data"
    fi
  done

  if [ -n "$volume_names" ]; then
    log 'volumes:'

    for name in $volume_names; do
      log "  $name:"
    done
  fi
}

compose_variable_value() { # <compose key>  — of the database_row loaded last
  case $1 in
    DATABASE) database_name_for "$DB_NAME" "$PLAN_PROJECT" ;;
    PASSWORD) printf '%s' "$DB_PASSWORD" ;;
    PUBLIC_HTTP_PORT) printf '%s' "$DB_HTTP_PORT" ;;
    PUBLIC_PORT) printf '%s' "$DB_PORT" ;;
    USER) printf '%s' "$DB_USER" ;;
    VERSION) printf '%s' "$DB_VERSION" ;;
  esac
}

render_env_dist() {
  local compose_project name prefix key
  compose_project="$PLAN_PROJECT-$PLAN_SERVICE"
  [ "$PLAN_SHARED" != true ] || compose_project=$PLAN_PROJECT
  log '# Rendered by gauntlet/init.sh; committed defaults for docker/compose.yml.' \
    '# docker/.env is the local copy compose reads — override there, never here.' \
    "COMPOSE_PROJECT_NAME=$compose_project"
  [ "$PLAN_SHARED" != true ] || log 'COMPOSE_IGNORE_ORPHANS=true'
  log '' '# Alpine tag of the node image; derived from engines.node in package.json.' "NODE_VERSION=$PLAN_NODE_VERSION"
  log '' "# This repository's service: /workspace/<SERVICE_NAME> in the container." \
    "SERVICE_NAME=$PLAN_SERVICE" \
    "SERVICE_PORT=$PLAN_SERVICE_PORT" \
    "SERVICE_PUBLIC_PORT=$PLAN_SERVICE_PORT" \
    "SERVICE_PUBLIC_DEBUG_PORT=$SERVICE_DEBUG_PORT"

  for name in $PLAN_DATABASES; do
    database_row "$name"
    prefix=$(to_upper "$name")

    if [ "$PLAN_SHARED" = true ]; then
      log '' "# $name — shared by the sibling repositories of $PLAN_PROJECT"
    else
      log '' "# $name"
    fi

    for key in $DB_COMPOSE_KEYS; do
      log "${prefix}_$key=$(compose_variable_value "$key")"
    done
  done
}

# The application reaches each database at the compose service name; this is the block for
# the application's own .env.example, printed rather than written because that file is
# application configuration.
render_application_env_block() {
  local name prefix first=1

  for name in $PLAN_DATABASES; do
    database_row "$name"
    prefix=$(to_upper "$name")
    [ "$first" -eq 1 ] || log ''
    first=0
    log "${prefix}_HOST=$name" \
      "${prefix}_PORT=$DB_PORT" \
      "${prefix}_USER=$DB_USER" \
      "${prefix}_PASSWORD=$DB_PASSWORD" \
      "${prefix}_DATABASE=$(database_name_for "$name" "$PLAN_PROJECT")"
  done
}

render_declaration() {
  if [ -n "$DECLARATION_PROJECT" ]; then
    log '{' "  \"project\": \"$DECLARATION_PROJECT\"," "  \"service\": \"$DECLARATION_SERVICE\"," "  \"stack\": \"$STACK\"" '}'
  else
    log '{' "  \"stack\": \"$STACK\"" '}'
  fi
}

# ── --check ─────────────────────────────────────────────────────────────────────────────────

PROBLEMS=''

add_problem() {
  PROBLEMS="$PROBLEMS${PROBLEMS:+
}$1"
}

# The git hook is the third gate; git silently skips a hook that is not executable or lives
# outside core.hooksPath, so both are verified here. core.hooksPath is per clone and never set
# on a CI runner, so that half is skipped under CI (and outside a git repository) — stated, not
# silent.
collect_git_hook_problems() {
  local pre_push_path="$PROJECT_ROOT/$GIT_PRE_PUSH_HOOK" configured_hooks_path candidate_path

  if [ ! -e "$pre_push_path" ]; then
    add_problem "missing git hook $GIT_PRE_PUSH_HOOK"
  elif [ ! -x "$pre_push_path" ]; then
    add_problem "$GIT_PRE_PUSH_HOOK is not executable — git would skip it silently: chmod +x $GIT_PRE_PUSH_HOOK and commit the mode"
  fi

  if [ -n "${CI:-}" ]; then
    log 'core.hooksPath not verified under CI (per-clone setting).'

    return 0
  fi

  if [ ! -e "$PROJECT_ROOT/.git" ]; then
    log "core.hooksPath not verified: $PROJECT_ROOT is not a git repository."

    return 0
  fi

  configured_hooks_path=$(cd "$PROJECT_ROOT" && git config --get core.hooksPath 2> /dev/null || true)
  configured_hooks_path=$(trim "$configured_hooks_path")

  if [ -z "$configured_hooks_path" ]; then
    add_problem "core.hooksPath is not set — the pre-push gate is not installed: git config core.hooksPath $GIT_HOOK_DIRECTORY"

    return 0
  fi

  case $configured_hooks_path in
    /*) candidate_path=$configured_hooks_path ;;
    *) candidate_path="$PROJECT_ROOT/$configured_hooks_path" ;;
  esac

  if [ -d "$candidate_path" ]; then
    candidate_path=$(cd "$candidate_path" && pwd -P)
  fi

  if [ "$candidate_path" != "$PROJECT_ROOT/$GIT_HOOK_DIRECTORY" ]; then
    add_problem "core.hooksPath is \"$configured_hooks_path\", expected $GIT_HOOK_DIRECTORY: git config core.hooksPath $GIT_HOOK_DIRECTORY"
  fi

  return 0
}

collect_shim_problems() { # <identity|rendered> files...
  local mode=$1 shim_file live_path template_path
  shift

  for shim_file in ${1+"$@"}; do
    live_path="$PROJECT_ROOT/$shim_file"
    template_path="$TEMPLATE_DIRECTORY/$shim_file"

    if [ ! -e "$live_path" ]; then
      add_problem "missing shim $shim_file — run \`bash gauntlet/init.sh\`"
    elif [ "$mode" = identity ]; then
      cmp -s "$template_path" "$live_path" ||
        add_problem "drifted shim $shim_file — it must match gauntlet/template/$shim_file byte for byte"
    else
      render_devcontainer "$template_path" "$DECLARED_PROJECT" "$DECLARED_SERVICE" | cmp -s - "$live_path" ||
        add_problem "drifted shim $shim_file — it must match gauntlet/template/$shim_file rendered with gauntlet.json byte for byte"
    fi
  done
}

collect_presence_problems() { # <kind> files...
  local kind=$1 file
  shift

  for file in ${1+"$@"}; do
    [ -e "$PROJECT_ROOT/$file" ] || add_problem "missing $kind $file — run \`bash gauntlet/init.sh\`"
  done
}

# A note, never a failure: the declaration is the truth, but the owner should hear when the
# project stops looking like it (a framework added for an experiment, a migration under way).
note_when_project_disagrees_with_declaration() { # <declared stack>
  inspect_project

  if [ -z "$DETECTED_STACKS" ] || list_contains "$DETECTED_STACKS" "$1"; then
    return 0
  fi

  log "Note: the project now looks like $(describe_detected_stacks ' or ') while gauntlet.json declares $1. Change the declaration deliberately if the project changed."
}

check_installation() {
  local devcontainer_text='no dev container'
  # shellcheck disable=SC2086
  collect_shim_problems identity $SHIM_FILES
  # shellcheck disable=SC2086
  collect_presence_problems seed $SEED_FILES
  read_declaration
  [ -z "$DECLARATION_ERROR" ] || add_problem "$DECLARATION_ERROR"

  if [ -n "$DECLARED_PROJECT" ]; then
    # shellcheck disable=SC2086
    collect_shim_problems rendered $DOCKER_SHIM_FILES
    # shellcheck disable=SC2086
    collect_presence_problems seed $DOCKER_SEED_FILES
    # shellcheck disable=SC2086
    collect_presence_problems 'generated file' $DOCKER_GENERATED_FILES
    devcontainer_text="dev container $DECLARED_PROJECT-$DECLARED_SERVICE"
  fi

  collect_git_hook_problems

  if [ -n "$PROBLEMS" ]; then
    log_error 'Gauntlet template check failed:'
    printf '%s\n' "$PROBLEMS" | sed 's/^/  - /' >&2
    exit 1
  fi

  note_when_project_disagrees_with_declaration "$DECLARED_STACK"
  log "Gauntlet template in sync (stack: $DECLARED_STACK, $devcontainer_text)."
}

# ── install ─────────────────────────────────────────────────────────────────────────────────

# Runs the producer command only when the file is absent, so nothing is ever overwritten, and
# into a temporary file first, so a producer that fails leaves no half-written file behind.
write_if_absent() { # <relative file> <producer command...>
  local relative_file=$1 destination_path temporary_path
  shift
  destination_path="$PROJECT_ROOT/$relative_file"

  if [ -e "$destination_path" ]; then
    log "  kept     $relative_file"

    return 0
  fi

  mkdir -p "$(dirname "$destination_path")"
  temporary_path="$destination_path.tmp.$$"

  if ! "$@" > "$temporary_path"; then
    rm -f "$temporary_path"
    fail "Could not render $relative_file — nothing was written to it."
  fi

  mv "$temporary_path" "$destination_path"
  log "  created  $relative_file"
}

gitignore_has_entry() { # <.gitignore path> <entry>
  awk -v entry="$2" '{ gsub(/^[ \t\r\f\v]+|[ \t\r\f\v]+$/, ""); if ($0 == entry) found = 1 } END { exit found ? 0 : 1 }' "$1"
}

append_gitignore_entries() {
  local gitignore_path="$PROJECT_ROOT/.gitignore" entry missing_entries='' separator=''

  for entry in $GITIGNORE_ENTRIES; do
    if [ -e "$gitignore_path" ] && gitignore_has_entry "$gitignore_path" "$entry"; then
      continue
    fi

    missing_entries="$missing_entries${missing_entries:+ }$entry"
  done

  [ -n "$missing_entries" ] || return 0

  if [ -s "$gitignore_path" ] && [ -n "$(tail -c 1 "$gitignore_path")" ]; then
    separator='
'
  fi

  # shellcheck disable=SC2086
  {
    printf '%s' "$separator"
    printf '%s\n' $missing_entries
  } >> "$gitignore_path"
  # shellcheck disable=SC2086
  log "  .gitignore + $(join_with ', ' $missing_entries)"
}

write_devcontainer_files() {
  local file

  for file in $DOCKER_SHIM_FILES; do
    write_if_absent "$file" render_devcontainer "$TEMPLATE_DIRECTORY/$file" "$PLAN_PROJECT" "$PLAN_SERVICE"
  done

  for file in $DOCKER_SEED_FILES; do
    write_if_absent "$file" cat "$TEMPLATE_DIRECTORY/$file"
  done

  if [ "$PLAN_RENDER" -eq 1 ]; then
    write_if_absent "$DOCKER_COMPOSE_FILE" render_compose
    write_if_absent "$DOCKER_ENV_DIST_FILE" render_env_dist
  else
    log "  kept     $DOCKER_COMPOSE_FILE" "  kept     $DOCKER_ENV_DIST_FILE"
  fi

  write_if_absent "$DOCKER_LOCAL_ENV_FILE" cat "$PROJECT_ROOT/$DOCKER_ENV_DIST_FILE"
}

write_declaration() {
  if [ "$HAS_EXISTING_DECLARATION" -eq 0 ]; then
    write_if_absent "$STACK_DECLARATION_FILE" render_declaration
  elif [ -z "$EXISTING_PROJECT" ] && [ -n "$DECLARATION_PROJECT" ]; then
    render_declaration > "$PROJECT_ROOT/$STACK_DECLARATION_FILE"
    log "  updated  $STACK_DECLARATION_FILE (project and service added)"
  else
    log "  kept     $STACK_DECLARATION_FILE"
  fi
}

print_manual_steps() { # <docker enabled 0|1>
  local seeds_text='' docker_enabled=$1
  [ "$docker_enabled" -eq 0 ] || seeds_text=', ports and versions in docker/.env.dist'
  log '' \
    'Manual steps left (once per project):' \
    "  1. chmod +x $GIT_PRE_PUSH_HOOK (commit the mode) and git config core.hooksPath $GIT_HOOK_DIRECTORY" \
    '  2. add to package.json "scripts":' \
    '       "gauntlet": "node gauntlet/gauntlet.mjs",' \
    '       "gauntlet:full": "node gauntlet/gauntlet.mjs --full",' \
    '       "crap": "node gauntlet/crap.mjs",' \
    '       "depcruise": "node gauntlet/gauntlet.mjs --only depcruise",' \
    '       "baseline:crap": "node gauntlet/crap.mjs --write-baseline",' \
    '       "baseline:depcruise": "mkdir -p baseline && depcruise src --output-type baseline --output-to baseline/depcruise.json"' \
    '  3. install the devDependencies listed in gauntlet/README.md' \
    '  4. review the seeds: thresholds in vitest.config.ts and stryker.config.mjs, words in cspell.json,' \
    '     conventions in .claude/rules/testing.md and .claude/skills/code-style/SKILL.md,' \
    "     the blank spec templates in spec/template/ (SPEC.template.md, context-map.template.md)$seeds_text" \
    '  5. create the GitHub label protected-approved once per repository (gh label create protected-approved):' \
    '     the protected-paths workflow only skips its check on a PR that carries it, and the owner adds it' \
    '     per PR after reading the protected diff' \
    '  6. bash gauntlet/init.sh --check, then node gauntlet/gauntlet.mjs'

  if [ "$docker_enabled" -eq 1 ] && [ -n "$PLAN_DATABASES" ]; then
    log '  7. the application reaches its databases at the compose service names — add to .env.example:'
    render_application_env_block | sed 's/^/       /'
  fi
}

install_kit() {
  local docker_enabled template_file
  # 1. Every answer and derivation first; nothing below the writes marker asks or can refuse.
  HAS_EXISTING_DECLARATION=0
  EXISTING_PROJECT=''
  EXISTING_SERVICE=''

  if [ -e "$PROJECT_ROOT/$STACK_DECLARATION_FILE" ]; then
    read_declaration
    [ -z "$DECLARATION_ERROR" ] || fail "$DECLARATION_ERROR"
    HAS_EXISTING_DECLARATION=1
    EXISTING_PROJECT=$DECLARED_PROJECT
    EXISTING_SERVICE=$DECLARED_SERVICE
  fi

  resolve_stack "$OPTION_STACK"

  if [ "$OPTION_DOCKER" = true ]; then
    docker_enabled=1
  elif [ "$OPTION_DOCKER" = false ] || is_inside_container; then
    docker_enabled=0
  else
    docker_enabled=1
  fi

  if [ "$docker_enabled" -eq 0 ] && [ "$OPTION_DOCKER" != false ] && has_devcontainer_option; then
    fail 'init runs inside a container, where the dev container files are skipped; pass --docker to render them anyway, or drop --project, --service, --database, --volume, --shared and --isolated.'
  fi

  DECLARATION_PROJECT=$EXISTING_PROJECT
  DECLARATION_SERVICE=$EXISTING_SERVICE

  if [ "$docker_enabled" -eq 1 ]; then
    plan_devcontainer
    DECLARATION_PROJECT=$PLAN_PROJECT
    DECLARATION_SERVICE=$PLAN_SERVICE
  fi

  # 2. Writes.
  log "Installing the gauntlet kit (stack: $STACK) into $PROJECT_ROOT"

  for template_file in $TEMPLATE_FILES; do
    if list_contains "$SHIM_FILES" "$template_file" || list_contains "$SEED_FILES" "$template_file"; then
      write_if_absent "$template_file" cat "$TEMPLATE_DIRECTORY/$template_file"
    fi
  done

  if [ "$docker_enabled" -eq 1 ]; then
    write_devcontainer_files
  elif [ "$OPTION_DOCKER" = false ]; then
    log '  skipped  dev container files (--no-docker)'
  else
    log '  skipped  dev container files: init runs inside a container (pass --docker to render them anyway)'
  fi

  write_declaration
  append_gitignore_entries
  print_manual_steps "$docker_enabled"
}

# ── entry point (only when executed directly; sourcing the file runs nothing) ───────────────

main() {
  parse_arguments ${1+"$@"}
  list_template_files
  assert_template_is_classified
  assert_stack_lists_agree

  if [ "$OPTION_CHECK" -eq 1 ]; then
    check_installation
  else
    install_kit
  fi

  exit 0
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main ${1+"$@"}
fi
