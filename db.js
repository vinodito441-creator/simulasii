const Database=require("better-sqlite3");
const db=new Database("reward.db");
db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user',
 balance INTEGER NOT NULL DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 reward INTEGER NOT NULL,
 download_url TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS submissions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 task_id INTEGER NOT NULL,
 invite_code TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,task_id)
);
CREATE TABLE IF NOT EXISTS payout_methods(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 method TEXT NOT NULL,
 account TEXT NOT NULL,
 account_name TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS withdrawals(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 amount INTEGER NOT NULL,
 method TEXT NOT NULL,
 account TEXT NOT NULL,
 status TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 paid_at TEXT
);
`);
const count=db.prepare("SELECT COUNT(*) c FROM tasks").get().c;
if(!count) db.prepare("INSERT INTO tasks(title,description,reward,download_url) VALUES(?,?,?,?)")
 .run("Tugas aplikasi","Download aplikasi, gunakan kode undangan, lalu submit kode untuk diverifikasi admin.",5000,"https://example.com/app");
const admin=db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin'").get().c;
if(!admin){
 const bcrypt=require("bcryptjs");
 db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)")
   .run("admin",bcrypt.hashSync("ganti-password-ini",10),"admin");
}
module.exports=db;
