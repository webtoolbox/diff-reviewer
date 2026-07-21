const{app,BrowserWindow,ipcMain}=require('electron'),p=require('path'),fs=require('fs');
['open-file','save-review','save-draft','load-draft','delete-draft','export-markdown','load-pr','open-pr-new-window'].forEach(h=>ipcMain.handle(h,async()=>null));
ipcMain.handle('save-image',async()=>null);
ipcMain.handle('list-prs',async()=>({prs:[]}));
ipcMain.handle('get-pr-commits',async()=>({commits:[],prUrl:''}));
ipcMain.handle('get-file-blame',async()=>({}));
ipcMain.handle('get-config',async()=>({}));
app.whenReady().then(async()=>{
  const diff=fs.readFileSync(process.argv[process.argv.length-1],'utf8');
  const w=new BrowserWindow({width:1200,height:750,show:false,webPreferences:{preload:p.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  w.loadFile('index.html');
  w.webContents.on('did-finish-load',async()=>{
    await w.webContents.executeJavaScript(`loadDiff(${JSON.stringify(diff)},'/tmp/test.diff')`);
    await new Promise(r=>setTimeout(r,2000));

    const info = await w.webContents.executeJavaScript(`
      const rightSide = document.querySelectorAll('.d2h-file-side-diff')[1];
      const wrapper = document.querySelector('.d2h-file-wrapper');
      
      // Check wrapper and right side overflow settings
      const wrapperStyles = getComputedStyle(wrapper);
      const rightStyles = getComputedStyle(rightSide);
      
      // Get the actual code content from a visible area
      const codeLines = rightSide.querySelectorAll('.d2h-code-side-line');
      const visibleLines = Array.from(codeLines).slice(2, 8).map(l => {
        const rect = l.getBoundingClientRect();
        return {
          text: l.textContent.trim().substring(0, 60),
          width: l.offsetWidth,
          height: l.offsetHeight,
          rectLeft: rect.left,
          rectRight: rect.right,
          color: getComputedStyle(l).color,
          visibility: getComputedStyle(l).visibility,
          display: getComputedStyle(l).display
        };
      });
      
      // Check the d2h-code-wrapper
      const codeWrapper = rightSide.querySelector('.d2h-code-wrapper');
      const codeWrapperStyles = codeWrapper ? getComputedStyle(codeWrapper) : {};
      
      JSON.stringify({
        wrapperOverflowX: wrapperStyles.overflowX,
        wrapperOverflowY: wrapperStyles.overflowY,
        rightOverflowX: rightStyles.overflowX,
        rightOverflowY: rightStyles.overflowY,
        rightWidth: rightSide.offsetWidth,
        rightScrollWidth: rightSide.scrollWidth,
        codeWrapperOverflow: codeWrapperStyles.overflowX,
        codeWrapperWidth: codeWrapper?.offsetWidth,
        codeWrapperScrollWidth: codeWrapper?.scrollWidth,
        visibleLines
      })
    `);
    console.log(info);
    app.exit(0);
  });
});
app.on('window-all-closed',()=>app.quit());
