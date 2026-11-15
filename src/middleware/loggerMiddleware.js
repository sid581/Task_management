const loggerMiddleware=(req,res,next)=>{
    console.log({
        method:req.method,
        url:req.url,
        time:new Date()
    });
    next();
}

export default loggerMiddleware