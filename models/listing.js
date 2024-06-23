const mongoose = require('mongoose');
const review=require('./reviews.js');
const Schema=mongoose.Schema;
const listschema = new Schema({
    product: { type: String, required: true },
    image1: {    
        path:String,
        filename:String,
    },
    image2: {    
        path:String,
        filename:String,
    },
    image3: {    
        path:String,
        filename:String,
    },
    price:{ type: Number, required: true },
    discount:{ type: Number},
    category: { type: String, required: true },
    createdat: { type: Date, default:Date.now() },
    reviews:[{type: Schema.Types.ObjectId,
        ref: 'review'}],
    order:{
        type:Number,
        required:true,
        min:1,
        max:50
    },
    suborder:{
        type:Number,
        required:true,
    },
    quantity:{
        type:String,
        required:true,
    },
    description:{
        type:String,
    }
    ,
    owner:{
        type:Schema.Types.ObjectId,
        ref:'User',
    },
});
listschema.post("findOneAndDelete", async (listing) => {
    if(listing){
         await review.deleteMany({_id:{$in:listing.reviews}}) ;
    }
});
let Listing = mongoose.model('Listing', listschema);

module.exports = Listing;