const express=require('express');
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const session = require('express-session')

const app=express();

mongoose.connect("mongodb+srv://terminator:testdb@accounts-0uu7d.mongodb.net/Users", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 6000000 }}))

const teacherDetails = new mongoose.Schema({
    username:String,
    password:String,
    courses:Array
});

const studentDetails = new mongoose.Schema({
    username:String,
    password:String,
    courses:Array
});

const coursesDetails = new mongoose.Schema({
    'course-name':String,
    'course-description':String,
    'teacher':{type: mongoose.Schema.Types.ObjectId, ref: 'teacher' }
});

const student = mongoose.model('student', studentDetails);
const teacher = mongoose.model('teacher', teacherDetails);
const allcourses = mongoose.model('course', coursesDetails);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/',function(req,res){
    if(!req.session.uid)
    res.render('login');
    else{
        if(req.session.type=="student")
        res.redirect("/student-panel");
        else
        res.redirect("/teacher-panel");
    }

});

app.get('/register',function(req,res){
    if(!req.session.uid)
    res.render('register');
    else{
        if(req.session.type=="student")
        res.redirect("/student-panel");
        else
        res.redirect("/teacher-panel");
    }
});

app.post("/teacher/register",function(req,res){
    teacher.findOne({username:req.body.username},function(err,user){
        if(user){
            res.send({type:false,message:"Already Exist"});
        } else {
            teacher.create(req.body,function(err,teacher){
                if(!err)
                res.send({type:true,message:"Resgistered Successfully"});
            });
        }
    });
});

app.post("/student/register",function(req,res){
   student.findOne({username:req.body.username},function(err,user){
        if(user){
            res.send({type:false,message:"Already Exist"});
        } else {
           student.create(req.body,function(err,student){
                if(!err)
                res.send({type:true,message:"Resgistered Successfully"});
            });
        }
    });
});

app.get("/teacher-panel",function(req,res){
    if(req.session.uid&&req.session.type=="teacher"){
        teacher.findOne({_id:req.session.uid},function(err,data){
            console.log(data.courses,data);
            res.render("teacher-courses",{data:data.courses});
        });
    }
    else
    res.redirect('/');
});

app.post("/teacher/login",function(req,res){
    teacher.findOne(req.body,function(err,teacher){
        if(!err){
            if(teacher){
                req.session.uid=teacher.id;
                req.session.type="teacher";
                res.send({type:true});
            }
            else
            res.send({type:false,message:"Invalid Credentials"});
        }
        else
        console.log(err);
    });
});

app.get("/student-panel",function(req,res){
    if(req.session.uid&&req.session.type=="student"){
        allcourses.
        find({}).
        populate('teacher').
        exec(function (err, course) {
            console.log(course);
            student.findOne({_id:req.session.uid},function(err,user){
                console.log(user);
                res.render("student-courses",{data:course,user:user.courses});
            });
        });
    }
    else
    res.redirect('/');
});

app.post("/student/login",function(req,res){
    student.findOne(req.body,function(err,student){
        if(!err){
            console.log(student);
            if(student){
                req.session.uid=student.id;
                req.session.type="student";
                res.send({type:true});
            }
            else
            res.send({type:false,message:"Invalid Credentials"});
        }
        else
        console.log(err);
    });
});

app.post("/addcourse",function(req,res){
    var data=req.body;
    data['teacher']=req.session.uid;
    allcourses.create(data,function(err,data){
        if(!err){
            var newData=req.body;
            newData.id=data._id;
            teacher.updateOne({_id:req.session.uid},{ $push: { courses: {course:newData,count:0} } },function(err,data){
                if(!err)
                res.redirect("/teacher-panel");
                else
                console.log(err);
            });
            console.log(data);
        }
        else
        console.log(err);
    });
});

app.post("/join/:id",function(req,res){
   console.log(req.params);
   allcourses.
   findOne({_id:req.params.id}).
   populate('teacher').
   exec(function (err, course) {
       var allData=course._id;
       course.teacher.courses.forEach(ele=>{
           console.log(allData,ele.course.id,allData.equals(ele.course.id));
           if(allData.equals(ele.course.id)){
            ele.count+=1;
            teacher.updateOne({_id:course.teacher._id},{$set : {courses : course.teacher.courses}},function(err,data){
                if(!err)
                student.updateOne({_id:req.session.uid},{ $push: { courses: req.params.id} },function(err,data){
                     if(!err){
                         res.redirect("/student-panel");
                     }
                 });
                else
                console.log(err);
            });
           }
       });
   });
});

app.post('/log-out', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(process.env.PORT||3000,function(){
    console.log('server started');
});