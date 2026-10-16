const fs = require('fs')
const path = require('path')
const { paths } = require('./config')
for (const p of [paths.db, paths.conversations, paths.gallery, paths.self, paths.restricted, paths.generated]) fs.mkdirSync(p,{recursive:true})
function ensure(file, fallback){ if(!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback,null,2)); }
ensure(paths.users,{})
ensure(paths.tasks,[])
ensure(paths.images,{})
ensure(paths.settings,{})
function read(file,fallback){ try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback} }
function write(file,data){ const tmp=file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(data,null,2)); fs.renameSync(tmp,file) }
function users(){return read(paths.users,{})}
function saveUsers(v){write(paths.users,v)}
function tasks(){return read(paths.tasks,[])}
function saveTasks(v){write(paths.tasks,v)}
function images(){return read(paths.images,{})}
function saveImages(v){write(paths.images,v)}
function settings(){return read(paths.settings,{})}
function saveSettings(v){write(paths.settings,v)}
function conversationFile(id){return path.join(paths.conversations, encodeURIComponent(id)+'.json')}
function conversation(id){return read(conversationFile(id),[])}
function saveConversation(id,v){write(conversationFile(id),v.slice(-80))}
module.exports={users,saveUsers,tasks,saveTasks,images,saveImages,settings,saveSettings,conversation,saveConversation}
