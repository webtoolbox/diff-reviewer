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

    // Click LEFT side (index 0) line - scroll file into view first
    const clickResult = await w.webContents.executeJavaScript(`(()=>{
      const sd=document.querySelectorAll('.d2h-file-side-diff');
      // sd[0] = left pane of first file, sd[1] = right pane of first file
      const leftPane = sd[0];
      if(!leftPane) return 'no left pane found';
      const lines=leftPane.querySelectorAll('.d2h-code-side-line:not(.d2h-code-side-emptyplaceholder)');
      if(lines.length < 3) return 'not enough lines: '+lines.length;
      // Click the 3rd line's button
      const btn=lines[2].querySelector('.line-comment-btn');
      if(!btn) return 'no button on line';
      btn.style.display='block';
      btn.click();
      return 'clicked left pane line, buttons found: '+lines.length;
    })()`);
    console.log('Click result:', clickResult);
    await new Promise(r=>setTimeout(r,500));

    // Check if form appeared
    const formCheck = await w.webContents.executeJavaScript(`
      (() => {
        const form = document.getElementById('active-comment-form');
        const label = document.querySelector('#active-comment-form .comment-label');
        const ta = document.querySelector('#active-comment-form textarea');
        const submit = document.querySelector('#active-comment-form #comment-submit');
        return {
          formExists: !!form,
          labelText: label ? label.textContent : null,
          formTag: form ? form.tagName : null,
          formParent: form ? form.parentElement.tagName : null,
        };
      })()
    `);
    console.log('Form check:', JSON.stringify(formCheck));

    // Type and scroll to form
    await w.webContents.executeJavaScript(`
      const ta = document.querySelector('#active-comment-form textarea');
      if(ta) ta.value = 'Move this variable to the Perl side.';
      const form = document.getElementById('active-comment-form');
      if(form) form.scrollIntoView({behavior:'instant', block:'start'});
    `);
    await new Promise(r=>setTimeout(r,500));

    fs.writeFileSync('/tmp/left-form.png',(await w.capturePage()).toPNG());
    console.log('1: Left form screenshot');

    // Submit
    await w.webContents.executeJavaScript(`document.querySelector('#comment-submit').click();`);
    await new Promise(r=>setTimeout(r,500));

    // Scroll to marker
    await w.webContents.executeJavaScript(`
      const markers = document.querySelectorAll('.line-comment-marker');
      if(markers.length) markers[markers.length-1].scrollIntoView({behavior:'instant', block:'start'});
    `);
    await new Promise(r=>setTimeout(r,300));

    fs.writeFileSync('/tmp/left-final.png',(await w.capturePage()).toPNG());
    console.log('2: Left final screenshot');
    app.exit(0);
  });
});
app.on('window-all-closed',()=>app.quit());
