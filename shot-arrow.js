const{app,BrowserWindow,ipcMain}=require('electron'),p=require('path'),fs=require('fs');
['open-file','save-review','save-draft','load-draft','delete-draft','export-markdown','load-pr','open-pr-new-window'].forEach(h=>ipcMain.handle(h,async()=>null));
ipcMain.handle('save-image',async()=>null);
ipcMain.handle('list-prs',async()=>({prs:[]}));
ipcMain.handle('get-pr-commits',async()=>({commits:[],prUrl:'#'}));
ipcMain.handle('get-file-blame',async()=>({}));
ipcMain.handle('get-config',async()=>({}));
app.whenReady().then(async()=>{
  const diff=fs.readFileSync(process.argv[process.argv.length-1],'utf8');
  const w=new BrowserWindow({width:1200,height:750,show:false,webPreferences:{preload:p.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  w.loadFile('index.html');
  w.webContents.on('did-finish-load',async()=>{
    await w.webContents.executeJavaScript(`loadDiff(${JSON.stringify(diff)},'/tmp/test.diff')`);
    await new Promise(r=>setTimeout(r,2000));
    await w.webContents.executeJavaScript(`
      currentPrTitle='Client-Selectable Icon';currentPrNumber='6690';
      currentPrBody='## Description\n\nThis PR adds client-selectable icon functionality.';
      updatePrInfoBar('6690','Client-Selectable Icon',{prAuthor:'amulya-wt',prAssignees:['sandeep','webtoolbox'],prBody:currentPrBody});
    `);
    await new Promise(r=>setTimeout(r,200));
    const img=await w.capturePage();
    fs.writeFileSync('/Users/sandeep/Repos/diff-reviewer/screenshots/preview.jpg',img.toJPEG(85));
    console.log('Saved');
    app.exit(0);
  });
});
app.on('window-all-closed',()=>app.quit());
