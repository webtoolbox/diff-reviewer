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

    // Check what the right side actually contains
    const info = await w.webContents.executeJavaScript(`
      const rightSide = document.querySelectorAll('.d2h-file-side-diff')[1];
      if (!rightSide) { JSON.stringify({error:'no right side found'}); }
      
      // Get all code cells in the right side
      const codeCells = rightSide.querySelectorAll('td.d2h-code-linenumber, td.d2h-code-side-linenumber, .d2h-code-line, .d2h-code-side-line');
      const firstFewCells = Array.from(codeCells).slice(0, 10).map(c => ({
        cls: c.className,
        text: c.textContent.trim().substring(0, 80),
        width: c.offsetWidth,
        height: c.offsetHeight,
        bg: getComputedStyle(c).backgroundColor
      }));
      
      // Also check the right side table structure
      const tables = rightSide.querySelectorAll('table');
      const tableInfo = Array.from(tables).map(t => ({
        cls: t.className,
        rows: t.rows?.length,
        width: t.offsetWidth,
        firstRowCells: t.rows?.[0]?.cells?.length
      }));
      
      // Check right side width and visibility
      const rightRect = rightSide.getBoundingClientRect();
      
      JSON.stringify({
        rightSideWidth: rightSide.offsetWidth,
        rightSideVisible: rightSide.style.display !== 'none',
        rightRect: {width: rightRect.width, height: rightRect.height, left: rightRect.left},
        tableInfo,
        firstFewCells,
        rightSideHTML: rightSide.innerHTML.substring(0, 500)
      })
    `);
    console.log(info);
    app.exit(0);
  });
});
app.on('window-all-closed',()=>app.quit());
