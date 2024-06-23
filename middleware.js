const Expresserror=require('./Expresserror.js');
const {Listingschema}=require('./schema.js');
const Listing=require('./models/listing.js');

// middleware/cartMiddleware.js
module.exports.cartMiddleware = (req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    res.locals.cart = req.session.cart;
    next();
};



module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl)
    {
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner=async (req,res,next)=>{
    let {id}=req.params;
    if(!(res.locals.currUser._id.equals(res.locals.ownerid)))
   {
    req.flash('error',"You don't have the permission");
    return res.redirect(`/listings/${id}`);
   }
   next();
};

module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash('error','You must login first');
        return res.redirect('/login') ;
      }
      next();
};


module.exports.valListing=(req,res,next)=>{
    let {error}= Listingschema.validate(req.body);
    if(error){
      let errMsg=error.details.map((el)=> el.message.split('.').pop().replace(/["']/g, '')).join(',');
     throw new Expresserror(400,errMsg);
    }
    else next();
  };


  module.exports.navbarlisting = async (req, res, next) => {
    try {
      const navlistings = await Listing.find().sort({ order: 1,suborder:1 }).exec()
      res.locals.navlistings = navlistings;
      next();
    } catch (err) {
      next(err);
    }
  };
  