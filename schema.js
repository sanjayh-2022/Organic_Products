const joi=require('joi');
module.exports.Listingschema=joi.object({
   listing:joi.object({product:joi.string().min(2).max(100).required(),
    description:joi.string().required(),
    image:joi.string().allow('',null),
    category:joi.string().required(),
    order:joi.number().required(),
    suborder:joi.number().required(),
    quantity:joi.string().required(),
    price:joi.number().min(1).required(),
    discount:joi.number(),
}) 
});