const mongoose=require('mongoose');
let productlistings=require('./data.js');
let listing=require("../models/listing.js");



main().then((res)=>{
    console.log(`MongoDB connection succesfull`);
 }).catch((err)=>console.error(err));
  async function main(){
    await mongoose.connect('')
};

let add= async()=>{
  await listing.deleteMany({});
  productlistings.data=productlistings.data.map((obj)=>({...obj,owner:"665c602ee9de83018204cfbe"}));
  await listing.insertMany(productlistings.data);
};
add();
