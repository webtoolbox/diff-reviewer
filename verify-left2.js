const{app,BrowserWindow,ipcMain}=require('electron'),p=require('path'),fs=require('fs');
ipcMain.handle('open-file',async()=>null);
ipcMain.handle('save-review',async()=>'/dev/null');
ipcMain.handle('save-draft',async()=>null);
ipcMain.handle('load-draft',async()=>null);
ipcMain.handle('delete-draft',async()=>null);
ipcMain.handle('get-config',async()=>({aiTagPrefix:'@Hermes',chatId:'test'}));
setTimeout(()=>{app.exit(0);},25000);
app.whenReady().then(async()=>{
  const diff=fs.readFileSync(process.argv[process.argv.length-1],'utf8');
  const w=new BrowserWindow({width:1400,height:900,show:true,webPreferences:{preload:p.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  w.loadFile('index.html');
  w.webContents.on('did-finish-load',async()=>{
    await w.webContents.executeJavaScript(`loadDiff(${JSON.stringify(diff)}, '/tmp/test.diff')`);
    await new Promise(r=>setTimeout(r,2000));

    // Click LEFT side line
    await w.webContents.executeJavaScript(`(()=>{
      const sd=document.querySelectorAll('.d2h-file-side-diff');
      for(let i=0;i<sd.length;i++){if(i%2===0){
        const lines=sd[i].querySelectorAll('.d2h-code-side-line:not(.d2h-code-side-emptyplaceholder)');
        if(lines.length>5){const btn=lines[5].querySelector('.line-comment-btn');
          if(btn){btn.style.display='block';btn.click();return 'clicked left';}}
      }}
      return 'no btn';
    })()`);
    await new Promise(r=>setTimeout(r,300));
    await w.webContents.executeJavaScript(`document.querySelector('#comment-text').value='Move this variable to Perl side.';`);
    await new Promise(r=>setTimeout(r,200));

    // Scroll to the form
    await w.webContents.executeJavaScript(`
      const form = document.getElementById('active-comment-form');
      if (form) form.scrollIntoView({behavior: 'instant', block: 'center'});
    `);
    await new Promise(r=>setTimeout(r,500));

    fs.writeFileSync('/tmp/verify-left-form.png',(await w.capturePage()).toPNG());
    console.log('Form screenshot saved');

    // Submit
    await w.webContents.executeJavaScript(`document.querySelector('#comment-submit').click();`);
    await new Promise(r=>setTimeout(r,300));

    // Scroll to the marker
    await w.webContents.executeJavaScript(`
      const markers = document.querySelectorAll('.line-comment-marker');
      if (markers.length > 0) markers[markers.length-1].scrollIntoView({behavior: 'instant', block: 'center'});
    `);
    await new Promise(r=>setTimeout(r,300));

    fs.writeFileSync('/tmp/verify-left-final.png',(await w.capturePage()).toPNG());
    console.log('Final screenshot saved');
    app.exit(0);
  });
});
app.on('window-all-closed',()=>app.quit());
