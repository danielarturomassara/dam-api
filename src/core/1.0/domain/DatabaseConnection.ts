export interface DatabaseConnection {
  disconnect (): Promise<void>
  getDatabase (): Promise<unknown>
}
export const DATABASE_CONNECTION = Symbol.for('DatabaseConnection');
