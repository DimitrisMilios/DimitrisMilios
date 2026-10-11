// prints times (s, relative to segment start) where the frame content changes noticeably
const fs=require('fs'),path=require('path'),sharp=require('sharp');
(async()=>{ const dir=process.argv[2]; const every=+process.argv[3]||6; const thr=+process.argv[4]||3;
 const idx=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8')); const fr=idx.frames; const t0=fr[0].t;
 let prev=null; const hits=[];
 for(let i=0;i<fr.length;i+=every){ const b=await sharp(path.join(dir,String(fr[i].f).padStart(5,'0')+'.jpg')).resize(64,40,{fit:'fill'}).greyscale().raw().toBuffer();
   if(prev){ let d=0; for(let k=0;k<b.length;k++) d+=Math.abs(b[k]-prev[k]); d/=b.length; if(d>thr) hits.push((fr[i].t-t0).toFixed(1)+':'+d.toFixed(0)); }
   prev=b; }
 console.log(path.basename(dir),'dur',(fr[fr.length-1].t-t0).toFixed(1),'activity', hits.join(' '));
})();
