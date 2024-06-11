
      require('dotenv').config();

const express=require('express');
const app=express();
const session=require('express-session');
const flash=require('connect-flash');
const path=require('path');
const cors=require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const passport=require("passport");
const localStrat=require('passport-local');
let User=require('./models/user.js');
const multer=require('multer');
const {storage}= require('./cloudConfig.js');
const upload=multer({storage});
const mongoose=require('mongoose');
const port=3000;
const ejsmate=require("ejs-mate");
const {isLoggedIn,valListing,saveRedirectUrl,cartMiddleware,isOwner}=require('./middleware.js');
const Expresserror=require('./Expresserror.js');
const methodoverride=require('method-override');
const Listing=require('./models/listing.js');
app.set('view engine','ejs');
app.set('views',path.join(__dirname,"/views"));
app.use(express.static(path.join(__dirname,'/public')));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.engine('ejs',ejsmate);
app.use(methodoverride("_method"));

const dbUrl=process.env.dburl;
let otps="";
//session options
sessionOptions={
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
      expires: Date.now() + 7*24*60*60*1000,
      maxAge:7*24*60*60*1000,
      httpOnly:true
    }
  };
  
//using sessions
app.use(session(sessionOptions))
app.use(flash());


//Using passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrat(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//Listening
app.listen(port,()=>{
    console.log(`Listening on port ${port}`);
});

//mongodb connection
main().then((res)=>{
    console.log(`MongoDB connection succesfull`);
 }).catch((err)=>console.error(err)); 
  async function main(){
    await mongoose.connect(dbUrl)
  }

let realOwner=process.env.realowner
  app.use((req,res,next)=>{
    res.locals.success=req.flash('success');
    res.locals.error=req.flash('error');
    res.locals.currUser=req.user;
    res.locals.ownerid=process.env.realowner;
    next();
  });

  app.use(cors())


   // Set up email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.email,
        pass: process.env.email_pass,
    }
});


app.use((req, res, next) => {
    if (req.method === 'GET'&& req.path !== '/login') {
        req.session.redirectUrl = req.originalUrl;
    }
    next();
});

//cart middleware
app.use(cartMiddleware);



app.get('/',async (req,res)=>{
    const data= await Listing.find().sort({ order: 1,suborder:1 }).exec();
    const categories = data.map(item => item.category);
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    req.session.redirectUrl = req.originalUrl;
    res.render('listings/index.ejs',{data,cart:req.session.cart});
});


app.get('/aboutus',async (req,res)=>{
    res.render('listings/aboutus.ejs');
});

app.get('/listings/:id',async(req,res)=>{
    const {id}=req.params;
    const  listing =await Listing.findById(id);
    if (!req.session.cart) {
        req.session.cart = [];
    }
    res.render('listings/show.ejs',{listing,cart:req.session.cart});
   
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});


app.post("/listing/addtocart/:id",isLoggedIn,async(req,res)=>{
       let {id}=req.params;
       const  listing =await Listing.findById(id);
       let count=0;
       if (!req.session.cart) {
        req.session.cart = [];
    }
       for(let i=0;i<req.session.cart.length;i++)
        {
            
            if (req.session.cart[i].product_id.toString() === listing._id.toString())
                {
                    
                    req.session.cart[i].quantity+=1;
                    count++;
                }       
        }
        if(count==0)
            {
                const cart_data={
                    product_id:listing._id,
                    product:listing.product,
                    price:listing.price,
                    image_path:listing.image.path,
                    quantity:1
                };
                req.session.cart.push(cart_data);
            }
            res.locals.redirectUrl=req.session.redirectUrl;
            res.redirect(res.locals.redirectUrl);
});

app.get("/showcart",async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    res.render('listings/showcart.ejs',{cart:req.session.cart});
});


app.get('/removeitemfromcart/:id',isLoggedIn,async(req,res)=>{
    let {id}=req.params;
    for(let i=0;i<req.session.cart.length;i++)
        {
            if(req.session.cart[i].product_id===id)
                {
                    req.session.cart.splice(i,1);
                }
        }
    res.redirect('/showcart');
});

app.get('/login',async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    res.render('users/login.ejs',{cart:req.session.cart});
});
app.get('/signup',async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    res.render('users/signup.ejs',{cart:req.session.cart});
});

app.post('/signup',async(req,res)=>{
    try{
        let {username,email,password,whatsappnumber,address}=req.body;
        const user1 = await User.findOne({ email });
        if (user1) {
            req.flash('error','Email is already registered with a account');
            res.redirect('/signup');
         }
        else{
        let  user=new User({username,email,whatsappnumber,address});
        let reguser=await User.register(user,password);
        req.login(reguser,(err)=>{
            if (err) return next(err);
            req.flash('success','Welcome to Atmanirbhar Bharath');
            res.redirect('/');
         
        });
    }
    }
        
    catch(err){
        req.flash('error',err.message)
    res.redirect('/signup');
    }
});


app.post('/login',passport.authenticate('local',{
    failureRedirect:'/login',failureFlash:true
}),async(req,res)=>{
    req.flash('success','Welcome back to Atmanirbhar Farm');
    res.redirect("/");
});

app.get('/logout',isLoggedIn,(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return  next(err);
        }
        req.flash('success','Successfully logged out');
        res.redirect('/');
    });
});


app.get('/forgotpassword',async(req,res)=>{
    res.render('users/enteremail.ejs');
});
app.post('/forgotpassword',async(req,res)=>{
     let {email}=req.body;
     const user = await User.findOne({ email });
     if (!user) {
        req.flash('error','Email not registered');
        res.redirect('/login');
     }
     else{
        // Generate OTP
        otps = crypto.randomBytes(3).toString('hex'); // You can use a more secure method if needed
        user.otp = otps;
        user.resetPasswordExpires = Date.now() + 180000; // 3 minutes to expire


        // Send email with OTP
        const mailOptions = {
            from: process.env.email,
            to: user.email,
            subject: 'Password Reset OTP hurry you have 3 minutes time',
            text: `Your OTP for password reset is ${otps}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                throw new Expresserror(500,"Failed to send Email")
            }
        });

        await user.save();
       let emailo=user.email;
        res.render('users/enterotp.ejs',{emailo});  
     }
     
});
app.post('/verifyotp',async(req,res)=>{
    let {otp,emailfront}=req.body;
    const email=emailfront;
    let otpb=" ";
    for(a of otp){
        otpb+=a;
    };
   let user = await User.findOne({ email });
   otpb=otpb.replace(/\s/g, '');
    if(user.otp===otpb)
        {
           await User.updateOne(
                { email: emailfront},    // The filter to find the document by email
                { $set: {otp: null } } // Set the field value to null
            );
            res.render('users/resetpassword',{emailfront});
        }
    else
     {
        await User.updateOne(
            { email: emailfront},    // The filter to find the document by email
            { $set: {otp: null } } // Set the field value to null
        );
        req.flash('error','Incorrect OTP');
        res.redirect('/forgotpassword');
     }
});


app.post('/resetpassword',async(req,res)=>{
    let {newpassword,confirmpassword,emailfront}=req.body;
    const email=emailfront;
    if(newpassword===confirmpassword)
        {
            let user = await User.findOne({ email });
            user.setPassword(newpassword, async (err) => {
                if (err) {
                    return res.status(500).send('Error setting new password');
                }
                user.resetPasswordExpires = undefined;
                await user.save();});
                req.flash('success','Password reset successfull');
                res.redirect('/login');
        }
    else{
        req.flash('error','Password does not match');
        res.render('users/resetpassword',emailfront);
    }
});

app.get('/listing/new',isLoggedIn,isOwner,async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
   res.render('listings/new.ejs',{cart:req.session.cart});
});


app.post('/listing/new',isLoggedIn,isOwner,valListing,upload.single('listing[image]'),async(req,res,next)=>{
     
    const category = req.body.listing.category;

    // Find all listings in the specified category
    const listingsInCategory = await Listing.find({ category });

    // Increment the suborder for each listing in the category
    for (let listing of listingsInCategory) {
      listing.suborder = (listing.suborder) + 1;
      await listing.save();
    } 


     let l1=new Listing(req.body.listing);
     l1.image.path=req.file.path;
     l1.image.filename=req.file.filename;
     l1.owner=res.locals.realowner;
     await l1.save();
 
     req.flash('success',"Your listing has been created!");
     res.redirect("/");
    });

app.get('/editlisting/:id',isLoggedIn,isOwner,async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
        let {id}=req.params;
        let find=await Listing.findById(id);
        if(!find){
         req.flash('error',"The listing you are looking for doesn't exist");
         res.redirect('/');
         return;
        }
        let origurl=await find.image.path;
        origurl=await origurl.replace('/upload','/upload/h_136,w_176');
        res.render("listings/edit.ejs",{cart:req.session.cart,find,origurl});
});
 
app.put('/editlisting/:id',isLoggedIn,isOwner,valListing,upload.single('listing[image]'),async(req,res,next)=>{
    if(!req.body.listing){
      throw new Expresserror(400,"Send valid data for listing")
    };
    let {id}=req.params;
    let ulist= await Listing.findByIdAndUpdate(id,{...req.body.listing},{runValidators:true});

    if(req.file)
    {
        let path=req.file.path;
        let filename=req.file.filename;
        ulist.image={path,filename};
        await ulist.save();
    }
   
    req.flash('success',"listing updated!");
    res.redirect(`/listings/${id}`);
  });
app.delete('/deletelisting/:id',isLoggedIn,isOwner,async(req,res)=>{let {id}=req.params;
let result=await Listing.findByIdAndDelete(id);
req.flash('success',"listing deleted");
res.redirect('/');
});

    app.all('*',(req,res,next)=>{
        next(new Expresserror(404,"Page not found!"));
      });
      
      //Error handling
      
      app.use((err,req,res,next)=>{
        let {statusCode=500,message="Something went wrong"}=err;
        res.status(statusCode).render('listings/error.ejs',{message});
      });
