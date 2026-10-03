const jwt=require("jsonwebtoken");
const SECRET=process.env.JWT_SECRET||"change-this-secret";
function sign(payload){return jwt.sign(payload,SECRET,{expiresIn:"7d"});}
function auth(req,res,next){
 try{
  const token=(req.headers.authorization||"").replace("Bearer ","");
  req.user=jwt.verify(token,SECRET); next();
 }catch{res.status(401).json({error:"unauthorized"});}
}
function adminOnly(req,res,next){ if(req.user.role!=="admin") return res.status(403).json({error:"admin only"}); next(); }
module.exports={auth,adminOnly,sign};
