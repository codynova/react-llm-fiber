export type VectorIndex = {
  upsert: (
    docs: Array<{ id: string; text: string; meta?: any }>
  ) => Promise<void>;

  search: (
    q: string,
    k?: number
  ) => Promise<Array<{ id: string; text: string; score: number; meta?: any }>>;
}
