const express = require("express");
const path = require("path");
const db = require("./db");
const { auth, adminOnly, sign } = require("./auth");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/auth/register", (req,res)=>{
  const {username,password} = req.body;
  if (!username || !password) return res.status(400).json({error:"username/password wajib"});
  const hash = require("bcryptjs").hashSync(password, 10);
  try {
    const r = db.prepare("INSERT INTO users(username,password_hash) VALUES(?,?)").run(username,hash);
    res.json({token:sign({id:r.lastInsertRowid,role:"user"}), username});
  } catch { res.status(409).json({error:"username sudah dipakai"}); }
});

app.post("/api/auth/login",(req,res)=>{
  const {username,password}=req.body;
  const u=db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if(!u || !require("bcryptjs").compareSync(password,u.password_hash))
    return res.status(401).json({error:"login gagal"});
  res.json({token:sign({id:u.id,role:u.role}), username:u.username, role:u.role});
});

app.get("/api/tasks", auth, (req,res)=>{
  res.json(db.prepare("SELECT id,title,description,reward,download_url FROM tasks WHERE active=1 ORDER BY id DESC").all());
});

app.post("/api/tasks/:id/submit", auth, (req,res)=>{
  const {invite_code}=req.body;
  const task=db.prepare("SELECT * FROM tasks WHERE id=? AND active=1").get(req.params.id);
  if(!task) return res.status(404).json({error:"task tidak ditemukan"});
  db.prepare(`INSERT INTO submissions(user_id,task_id,invite_code,status)
              VALUES(?,?,?,'pending') ON CONFLICT(user_id,task_id)
              DO UPDATE SET invite_code=excluded.invite_code,status='pending'`)
    .run(req.user.id,task.id,invite_code||"");
  res.json({ok:true,status:"pending"});
});

app.get("/api/me", auth, (req,res)=>{
  const u=db.prepare("SELECT id,username,balance FROM users WHERE id=?").get(req.user.id);
  const withdrawals=db.prepare("SELECT id,amount,method,account,status,created_at FROM withdrawals WHERE user_id=? ORDER BY id DESC").all(req.user.id);
  res.json({user:u, withdrawals});
});

app.post("/api/me/payout-method", auth, (req,res)=>{
  const {method,account,name}=req.body;
  if(!["bank","ewallet"].includes(method) || !account || !name)
    return res.status(400).json({error:"data payout tidak lengkap"});
  db.prepare("INSERT INTO payout_methods(user_id,method,account,account_name) VALUES(?,?,?,?)")
    .run(req.user.id,method,account,name);
  res.json({ok:true});
});

app.post("/api/withdraw", auth, (req,res)=>{
  const amount=Number(req.body.amount);
  const pm=db.prepare("SELECT * FROM payout_methods WHERE user_id=? ORDER BY id DESC LIMIT 1").get(req.user.id);
  if(!pm) return res.status(400).json({error:"tambahkan rekening/e-wallet dulu"});
  if(!Number.isInteger(amount) || amount < 1000) return res.status(400).json({error:"minimum penarikan Rp1.000"});
  const tx=db.transaction(()=>{
    const u=db.prepare("SELECT balance FROM users WHERE id=?").get(req.user.id);
    if(u.balance < amount) throw new Error("saldo tidak cukup");
    db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(amount,req.user.id);
    db.prepare(`INSERT INTO withdrawals(user_id,amount,method,account,status)
                VALUES(?,?,?,?, 'requested')`).run(req.user.id,amount,pm.method,pm.account);
  });
  try { tx(); res.json({ok:true,status:"requested"}); }
  catch(e){ res.status(400).json({error:e.message}); }
});

/* ADMIN */
app.get("/api/admin/submissions", auth, adminOnly, (req,res)=>{
  res.json(db.prepare(`SELECT s.*,u.username,t.title,t.reward
    FROM submissions s JOIN users u ON u.id=s.user_id JOIN tasks t ON t.id=s.task_id
    ORDER BY s.id DESC`).all());
});

app.post("/api/admin/submissions/:id/verify", auth, adminOnly, (req,res)=>{
  const {approved}=req.body;
  const s=db.prepare(`SELECT s.*,t.reward FROM submissions s JOIN tasks t ON t.id=s.task_id WHERE s.id=?`).get(req.params.id);
  if(!s) return res.status(404).json({error:"submission tidak ditemukan"});
  const tx=db.transaction(()=>{
    if(approved && s.status!=="verified"){
      db.prepare("UPDATE submissions SET status='verified' WHERE id=?").run(s.id);
      db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(s.reward,s.user_id);
    } else if(!approved) {
      db.prepare("UPDATE submissions SET status='rejected' WHERE id=?").run(s.id);
    }
  });
  tx(); res.json({ok:true});
});

app.get("/api/admin/withdrawals", auth, adminOnly, (req,res)=>{
  res.json(db.prepare(`SELECT w.*,u.username FROM withdrawals w JOIN users u ON u.id=w.user_id
                       ORDER BY w.id DESC`).all());
});

/* Mock payout: production harus diganti provider payout/disbursement resmi. */
app.post("/api/admin/withdrawals/:id/pay", auth, adminOnly, (req,res)=>{
  const w=db.prepare("SELECT * FROM withdrawals WHERE id=?").get(req.params.id);
  if(!w) return res.status(404).json({error:"withdrawal tidak ditemukan"});
  if(w.status!=="requested") return res.status(400).json({error:"status bukan requested"});
  db.prepare("UPDATE withdrawals SET status='paid',paid_at=CURRENT_TIMESTAMP WHERE id=?").run(w.id);
  res.json({ok:true,status:"paid",note:"MOCK PAYMENT: belum mengirim uang sungguhan"});
});

app.listen(3000,()=>console.log("http://localhost:3000"));
