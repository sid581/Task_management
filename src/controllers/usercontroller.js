
import User from "../models/User.js"

export const getUsers=async(req,res)=>{
    try {
        const users=await User.findAll()
        res.status(200).json(users)
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
    }
}

export const getUserById=async(req,res)=>{
    // const userId=Number(req.params.id)

    // const user=users.find(e=>e.id===userId)

    // if(!user){
    //     return res.status(404).json({
    //         success:false,
    //         message:'User not found '
    //     })
    // }

    // res.status(200).json({
    //     success:true,
    //     data:user
    // })
    try {
        const user=await User.findByPk(req.params.id)

        if(!user){
            return res.status(404).json({
                message:"user not Found"
            })
        }
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
    }
}
 
export const updateUserByName=async(req,res)=>{

    try {
        const id=Number(req.params.id)
        const user=await User.findByPk(id);
        const {name}=req.body
        if(!name){
            res.status(400).json({
                success:false,
                message:"Name is required"
            })
        }

        if(!user){
            res.status(404).json({
                success:false,
                message:"USer not Found by id"
            })
        }
        user.name=name

        user.save()
    
        res.status(200).json({
            success:true,
            message:"user updated",
            data:user
        })
    } catch (error) {
        res.status(500).json({
            message:error.message
        })
    }

}

export const getProfile=(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"user fetched succesfully",
        data:req.user
    })
}

export const getAdminDashboard=(req,res)=>{
    res.status(200).json({
        success:true,
        message:"welcome to admin dashboard",
        user:req.user
    })
}