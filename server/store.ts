import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class Store {
  db:DatabaseSync;
  constructor(path:string){
    if(path!==':memory:') mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,phone TEXT NOT NULL,hash TEXT NOT NULL,salt TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS documents(kind TEXT NOT NULL,id TEXT NOT NULL,owner TEXT NOT NULL,body TEXT NOT NULL,expires INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,PRIMARY KEY(kind,id));
      CREATE INDEX IF NOT EXISTS document_owner ON documents(kind,owner);
      CREATE TABLE IF NOT EXISTS idempotency(owner TEXT NOT NULL,key TEXT NOT NULL,booking_id TEXT NOT NULL,quote_id TEXT NOT NULL,PRIMARY KEY(owner,key));
      CREATE TABLE IF NOT EXISTS booking_locks(quote_id TEXT PRIMARY KEY,booking_id TEXT NOT NULL);`);
  }
  put(kind:string,id:string,owner:string,body:unknown,expires=0){ this.db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body,expires=excluded.expires').run(kind,id,owner,JSON.stringify(body),expires,Date.now()); }
  get<T=any>(kind:string,id:string,owner?:string):T|undefined { const r=this.db.prepare('SELECT * FROM documents WHERE kind=? AND id=?').get(kind,id) as any; return r && (!owner||r.owner===owner) && (!r.expires||r.expires>Date.now())?JSON.parse(r.body):undefined; }
  list<T=any>(kind:string,owner:string):T[]{return (this.db.prepare('SELECT body FROM documents WHERE kind=? AND owner=? AND (expires=0 OR expires>?) ORDER BY created DESC').all(kind,owner,Date.now()) as any[]).map(r=>JSON.parse(r.body));}
  remove(kind:string,id:string,owner:string){this.db.prepare('DELETE FROM documents WHERE kind=? AND id=? AND owner=?').run(kind,id,owner);}
  close(){this.db.close();}
}
