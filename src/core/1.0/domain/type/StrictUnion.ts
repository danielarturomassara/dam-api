export type StrictUnion<UNION> = StrictUnionMember<UNION, UNION>;

type StrictUnionMember<MEMBER, FULL_UNION> = MEMBER extends unknown
  ? MEMBER & Partial<Record<Exclude<UnionKeys<FULL_UNION>, keyof MEMBER>, never>>
  : never;

type UnionKeys<UNION> = UNION extends unknown ? keyof UNION : never;
