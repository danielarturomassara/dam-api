import {Nullable} from '@core/domain/type/Nullable.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {config as loadDotenv} from 'dotenv';
import {Db, MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

import {LoggerSpy} from './LoggerSpy.js';
import {MongoConfigFake} from './MongoConfigFake.js';

class MongoTestConnection extends MongoConnection {
  public constructor (
    private readonly testDatabaseName: string,
    private readonly getClient: () => Promise<MongoClient>
  ) {
    super(new MongoConfigFake({databaseName: testDatabaseName, host: 'unused', password: null, port: 0, user: null}), new LoggerSpy());
  }

  public override async disconnect (): Promise<void> {
    return;
  }

  public override async getDatabase (): Promise<Db> {
    const client = await this.getClient();

    return client.db(this.testDatabaseName);
  }
}

// Connects the suites to a real mongod. TEST_MONGODB_URI (from .env) points at the compose
// `mongodb` service — the Alpine devcontainer cannot execute mongod binaries; without it a
// mongodb-memory-server instance is started (glibc environments such as the CI runners).
export class MongoTestServer {
  private client: Nullable<MongoClient> = null;
  private memoryServer: Nullable<MongoMemoryServer> = null;
  private uri: Nullable<string> = null;

  public constructor (private readonly databaseName: string) {}

  public buildConnection (): MongoConnection {
    return new MongoTestConnection(this.databaseName, () => this.getClient());
  }

  public async getClient (): Promise<MongoClient> {
    if (!this.client) {
      this.client = await new MongoClient(await this.getUri()).connect();
    }

    return this.client;
  }

  public async getUri (): Promise<string> {
    if (this.uri) {
      return this.uri;
    }

    loadDotenv();

    const configuredUri = process.env.TEST_MONGODB_URI;

    if (configuredUri) {
      this.uri = configuredUri;

      return this.uri;
    }

    this.memoryServer = await MongoMemoryServer.create();
    this.uri = this.memoryServer.getUri();

    return this.uri;
  }

  public async stop (): Promise<void> {
    await this.client?.close();
    await this.memoryServer?.stop();

    this.client = null;
    this.memoryServer = null;
  }
}
