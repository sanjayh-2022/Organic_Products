
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
const { storage,cloudinary }= require('./cloudConfig.js');
const upload=multer({ storage });
const mongoose=require('mongoose');
const port=3000;
const ejsmate=require("ejs-mate");
const {isLoggedIn,valListing,saveRedirectUrl,cartMiddleware,isOwner,navbarlisting}=require('./middleware.js');
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



app.get('/',navbarlisting,async (req,res)=>{
    const data= await Listing.find().sort({ order: 1,suborder:1 }).exec();
    const categories = data.map(item => item.category);
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    req.session.redirectUrl = req.originalUrl;
    res.render('listings/index.ejs',{data,cart:req.session.cart});
});


app.get('/aboutus',navbarlisting,async (req,res)=>{
    res.render('listings/aboutus.ejs');
});

app.get('/listings/:id',navbarlisting,async(req,res)=>{
    const {id}=req.params;
    const  listing =await Listing.findById(id);
    if (!req.session.cart) {
        req.session.cart = [];
    }
    res.render('listings/show.ejs',{listing,cart:req.session.cart});
   
});

app.get('/sitemap.xml', navbarlisting,(req, res) => {
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

app.get("/showcart",navbarlisting,cartMiddleware,async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    res.render('listings/showcart.ejs',{cart:req.session.cart});
});


app.get('/removeitemfromcart/:id',navbarlisting,isLoggedIn,async(req,res)=>{
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

app.get('/login',navbarlisting,async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
    res.render('users/login.ejs',{cart:req.session.cart});
});
app.get('/signup',navbarlisting,async(req,res)=>{
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

app.get('/logout',navbarlisting,isLoggedIn,(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return  next(err);
        }
        req.flash('success','Successfully logged out');
        res.redirect('/');
    });
});


app.get('/forgotpassword',navbarlisting,async(req,res)=>{
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

app.get('/listing/new',navbarlisting,cartMiddleware,isLoggedIn,isOwner,async(req,res)=>{
    if(!req.session.cart)
        {
            req.session.cart=[];
        }
   res.render('listings/new.ejs',{cart:req.session.cart});
});


app.post('/listing/new', isLoggedIn, isOwner, valListing, upload.fields([
    { name: 'listing[image1]', maxCount: 1 },
    { name: 'listing[image2]', maxCount: 1 },
    { name: 'listing[image3]', maxCount: 1 }
  ]), async (req, res, next) => {
    try {
      const category = req.body.listing.category;
      console.log(category);
      // Find all listings in the specified category and increment their suborder
      await Listing.updateMany({ category }, { $inc: { suborder: 1 } });
  
      let l1 = new Listing(req.body.listing);
      
      if (req.files['listing[image1]']) {
        l1.image1 = {
          path: req.files['listing[image1]'][0].path,
          filename: req.files['listing[image1]'][0].filename
        };
      }
  
      if (req.files['listing[image2]']) {
        l1.image2 = {
          path: req.files['listing[image2]'][0].path,
          filename: req.files['listing[image2]'][0].filename
        };
      }
  
      if (req.files['listing[image3]']) {
        l1.image3 = {
          path: req.files['listing[image3]'][0].path,
          filename: req.files['listing[image3]'][0].filename
        };
      }
  
      l1.owner = res.locals.realowner;
      await l1.save();
  
      req.flash('success', "Your listing has been created!");
      res.redirect("/");
    } catch (error) {
      console.error('Error creating listing:', error);
      req.flash('error', 'There was an error creating your listing.');
      res.redirect('/');
    }
  });
  
  
  app.get('/editlisting/:id', navbarlisting,cartMiddleware, isLoggedIn, isOwner, async (req, res) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }

    let { id } = req.params;
    try {
        let find = await Listing.findById(id);

        if (!find) {
            req.flash('error', "The listing you are looking for doesn't exist");
            return res.redirect('/');
        }

        let origurl1 = find.image1 && find.image1.path ? find.image1.path.replace('/upload', '/upload/h_136,w_176') : '';
        let origurl2 = find.image2 && find.image2.path ? find.image2.path.replace('/upload', '/upload/h_136,w_176') : '';
        let origurl3 = find.image3 && find.image3.path ? find.image3.path.replace('/upload', '/upload/h_136,w_176') : '';

        res.render("listings/edit.ejs", { cart: req.session.cart, find, origurl1, origurl2, origurl3 });
    } catch (error) {
        console.error('Error fetching or processing listing:', error);
        req.flash('error', 'There was an error fetching or processing the listing.');
        res.redirect('/');
    }
});

 
app.put('/editlisting/:id', isLoggedIn, isOwner, valListing, upload.fields([
    { name: 'listing[image1]', maxCount: 1 },
    { name: 'listing[image2]', maxCount: 1 },
    { name: 'listing[image3]', maxCount: 1 }
]), async (req, res, next) => {
    try {
        if (!req.body.listing) {
            throw new Expresserror(400, "Send valid data for listing");
        }

        let { id } = req.params;
        let updatedListing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true, runValidators: true });

        if (!updatedListing) {
            req.flash('error', "Listing not found");
            return res.redirect('/');
        }

        if (req.files['listing[image1]']) {
            updatedListing.image1 = {
                path: req.files['listing[image1]'][0].path,
                filename: req.files['listing[image1]'][0].filename
            };
        }

        if (req.files['listing[image2]']) {
            updatedListing.image2 = {
                path: req.files['listing[image2]'][0].path,
                filename: req.files['listing[image2]'][0].filename
            };
        }

        if (req.files['listing[image3]']) {
            updatedListing.image3 = {
                path: req.files['listing[image3]'][0].path,
                filename: req.files['listing[image3]'][0].filename
            };
        }

        await updatedListing.save(); // Save the updated listing

        req.flash('success', "Listing updated!");
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error('Error updating listing:', error);
        req.flash('error', 'Error updating listing');
        res.redirect('/');
    }
});

app.delete('/deletelisting/:id',isLoggedIn,isOwner,async(req,res)=>{let {id}=req.params;
let result=await Listing.findByIdAndDelete(id);
req.flash('success',"listing deleted");
res.redirect('/');
});

app.post('/confirmorder', isLoggedIn, (req, res) => {
    const orderDetails = req.body;
    
    
    let pret= "Here are the items in your cart:\n\n";
            orderDetails.items.forEach((item) => { 
              pret += `${item.sl_no }. ${item.product} - Quantity: ${item.quantity }, Price: ${(item.quantity) * (item.price) }\n`;
             })
            pret += `\nTotal: ${orderDetails.total}`;
            pret += "\n\nCustomer Details:\n";
            pret += `Name: ${orderDetails.user.name }\n`;
            pret += `Phone: ${orderDetails.user.phone }\n`;
            pret += `Address: ${orderDetails.user.address }`;
            console.log(pret);
     // Send email with OTP
     const mailOptions = {
        from: process.env.email,
        to: process.env.email,
        subject: "Order details",
        text: `The order details are : ${pret}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            throw new Expresserror(500,"Failed to send Email")
        }
    });
    req.flash('success',"Order confirmed");
    res.redirect('/');
});

    app.all('*',navbarlisting,(req,res,next)=>{
        next(new Expresserror(404,"Page not found!"));
      });
      
      //Error handling
      
      app.use((err,req,res,next)=>{
        let {statusCode=500,message="Something went wrong"}=err;
        res.status(statusCode).render('listings/error.ejs',{message});
      });
