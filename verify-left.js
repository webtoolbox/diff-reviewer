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

    // Check form position
    const check = await w.webContents.executeJavaScript(`
      (() => {
        const submit = document.querySelector('#comment-submit');
        const cancel = document.querySelector('#comment-cancel');
        const label = document.querySelector('.comment-form-row .comment-label');
        return {
          submit: submit ? submit.getBoundingClientRect().toJSON() : null,
          cancel: cancel ? cancel.getBoundingClientRect().toJSON() : null,
          label: label ? label.getBoundingClientRect().toJSON() : null,
          viewport: {width: window.innerWidth, height: window.innerHeight}
        };
      })()
    `);
    console.log(JSON.stringify(check, null, 2));

    await w.webContents.executeJavaScript(`document.querySelector('#comment-text').value='Move this variable to Perl side.';`);
    await new Promise(r=>setTimeout(r,200));
    fs.writeFileSync('/tmp/verify-left-form.png',(await w.capturePage()).toPNG());

    await w.webContents.executeJavaScript(`document.querySelector('#comment-submit').click();`);
    await new Promise(r=>setTimeout(r,500));
    fs.writeFileSync('/tmp/verify-left-final.png',(await w.capturePage()).toPNG());
    console.log('DONE');
    app.exit(0);
  });
});
app.on('window-all-closed',()=>app.quit());
