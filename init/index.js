const mongoose=require('mongoose');
let productlistings=require('./data.js');
let listing=require("../models/listing.js");



main().then((res)=>{
    console.log(`MongoDB connection succesfull`);
 }).catch((err)=>console.error(err));
  async function main(){
    await mongoose.connect('mongodb+srv://developersmartariser:NwVjTYKochBmRDrT@cluster0.grw8sdi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
};

let add= async()=>{
  await listing.deleteMany({});
  productlistings.data=productlistings.data.map((obj)=>({...obj,owner:"665f513de91b48b406046ac3"}));
  await listing.insertMany(productlistings.data);
};
add();
