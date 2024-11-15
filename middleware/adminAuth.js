const isAdminAuthenticated = (req,res,next)=>{
    if(!req.session.admin){
        return res.redirect('/admin/login')
    }
    next()
}

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.admin) {
      res.redirect("/admin/dashboard"); 
    } else {
      next(); 
    }
  };

  const restrictBlockedUsers = (req, res, next) => {
    if (req.session.user && req.session.user.isBlocked) {
      return res.status(403).send('Your account is blocked. Contact admin.');
    }
    next();
  };
  
  
  

module.exports = {isAdminAuthenticated , redirectIfAuthenticated,restrictBlockedUsers}