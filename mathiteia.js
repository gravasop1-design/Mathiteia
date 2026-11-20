
(function(){
  var DAY=86400000, N=156, TEAM=24, ISO=/^\d{4}-\d{2}-\d{2}$/;
  var WD=["Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"];
  var WDS=["Κυρ","Δευ","Τρί","Τετ","Πέμ","Παρ","Σάβ"];
  var WDF=["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"];
  var HOL=[
    {k:"f-1-1",m:1,d:1,n:"Πρωτοχρονιά",g:"f"},
    {k:"f-1-6",m:1,d:6,n:"Θεοφάνεια",g:"f"},
    {k:"f-3-25",m:3,d:25,n:"Εθνική εορτή (25η Μαρτίου)",g:"f"},
    {k:"f-5-1",m:5,d:1,n:"Πρωτομαγιά (μετακινείται στην 1η εργάσιμη αν πέφτει σε αργία)",g:"f"},
    {k:"f-8-15",m:8,d:15,n:"Κοίμηση της Θεοτόκου",g:"f"},
    {k:"f-10-28",m:10,d:28,n:"Ημέρα του Όχι (28η Οκτωβρίου)",g:"f"},
    {k:"f-12-25",m:12,d:25,n:"Χριστούγεννα",g:"f"},
    {k:"f-12-26",m:12,d:26,n:"Σύναξη της Θεοτόκου",g:"f"},
    {k:"e-48",o:-48,n:"Καθαρά Δευτέρα",g:"e"},
    {k:"e-2",o:-2,n:"Μεγάλη Παρασκευή",g:"e"},
    {k:"e-1",o:-1,n:"Μεγάλο Σάββατο",g:"e"},
    {k:"e0",o:0,n:"Κυριακή του Πάσχα",g:"e"},
    {k:"e1",o:1,n:"Δευτέρα του Πάσχα",g:"e"},
    {k:"e50",o:50,n:"Αγίου Πνεύματος",g:"e"}
  ];
  var DEFAULT_OFF=["e-1"];

  var KEY="ergasimes-v1";
  
  var state={off:DEFAULT_OFF.slice(),custom:[],days:new Array(1,2,3,4),team:[],sy:2026,sort:"name",dir:"asc"};


  try{
    var raw=localStorage.getItem(KEY);
    if(raw){
      var s0=JSON.parse(raw);
      if(s0&&s0.off&&s0.custom){state.off=s0.off; state.custom=s0.custom;}
      if(s0&&s0.days&&s0.days.length===4) state.days=s0.days;
      if(s0&&s0.team) state.team=s0.team;
      if(s0&&s0.sy>=1990&&s0.sy<=2098) state.sy=s0.sy;
      if(s0&&(s0.sort==="name"||s0.sort==="start"||s0.sort==="end")) state.sort=s0.sort;
      if(s0&&s0.dir==="desc") state.dir="desc";
    }
  }catch(e){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  function teamInit(){
    while(state.team.length<TEAM) state.team.push({name:"",start:"",abs:0,off:false});
    state.team=state.team.slice(0,TEAM);
  }
  teamInit();


  function syStart(){return Date.UTC(state.sy,8,1);}
  function syEnd(){return Date.UTC(state.sy+1,7,31);}
  function syLabel(){return state.sy+"–"+String(state.sy+1).slice(2);}

  function pad(x){return String(x).padStart(2,"0");}
  function iso(ms){var d=new Date(ms);return d.getUTCFullYear()+"-"+pad(d.getUTCMonth()+1)+"-"+pad(d.getUTCDate());}
  function dmy(ms){var d=new Date(ms);return pad(d.getUTCDate())+"/"+pad(d.getUTCMonth()+1)+"/"+d.getUTCFullYear();}
  function fmtW(ms){return WDS[new Date(ms).getUTCDay()]+" "+dmy(ms);}
  function parseISO(s){if(!ISO.test(s||"")) return null; var p=s.split("-").map(Number); return Date.UTC(p.at(0),p.at(1)-1,p.at(2));}
  function parseDMY(s){
    var m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s||""); if(!m) return null;
    var d=+m.at(1),mo=+m.at(2),y=+m.at(3), ms=Date.UTC(y,mo-1,d), t=new Date(ms);
    return (t.getUTCFullYear()===y && t.getUTCMonth()===mo-1 && t.getUTCDate()===d && y>=1900 && y<=2200)?ms:null;
  }

  function parseAny(s){s=(s||"").trim(); var a=parseDMY(s); return a!==null?a:parseISO(s);}
  function maskInput(inp,onChange){
    inp.type="text"; inp.inputMode="numeric"; inp.placeholder="ηη/μμ/εεεε"; inp.maxLength=10; inp.autocomplete="off";
    inp.addEventListener("input",function(){
      var raw=inp.value.replace(/[.\-]/g,"/").replace(/^(\d)\/$/,function(m,a){return "0"+a+"/";}).replace(/^(\d\d\/)(\d)\/$/,function(m,a,b){return a+"0"+b+"/";});
      var dg=raw.replace(/\D/g,"").slice(0,8), out=dg;
      if(dg.length>4) out=dg.slice(0,2)+"/"+dg.slice(2,4)+"/"+dg.slice(4);
      else if(dg.length>2) out=dg.slice(0,2)+"/"+dg.slice(2);
      inp.value=out;
      var ms=parseDMY(out);
      inp.setAttribute("aria-invalid",(out.length===10 && ms===null)?"true":"false");
      onChange(ms,out);
    });
  }
  function withPicker(inp,onPick){
    var wrap=document.createElement("div"); wrap.className="dp";
    var pk=document.createElement("span"); pk.className="pk";
    pk.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
    var di=document.createElement("input"); di.type="date";
    di.setAttribute("aria-label","Επιλογή ημερομηνίας από ημερολόγιο");
    function lim(){di.min="1990-01-01"; di.max="2098-12-31";}
    function sync(){var ms=parseDMY(inp.value); di.value=ms!==null?iso(ms):"";}
    lim(); sync();
    di.addEventListener("pointerdown",lim); di.addEventListener("focus",lim);
    di.addEventListener("click",function(){lim(); try{di.showPicker();}catch(e){}});
    di.addEventListener("change",function(){var ms=parseISO(di.value); if(ms===null) return; inp.value=dmy(ms); inp.setAttribute("aria-invalid","false"); onPick(ms);});
    inp.addEventListener("input",sync);
    pk.appendChild(di); wrap.appendChild(inp); wrap.appendChild(pk);
    return wrap;
  }



  function flagSY(inp,v){
    var bad=v!==null && (v<syStart()||v>syEnd());
    if(v!==null) inp.setAttribute("aria-invalid",bad?"true":"false");
    inp.title=bad?"Εκτός σχολικού έτους "+syLabel():"";
  }
  function easter(y){
    var a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
    var m=Math.floor((d+e+114)/31), dd=((d+e+114)%31)+1;
    return Date.UTC(y,m-1,dd+13);
  }
  function holMs(h,y){return h.g==="f"?Date.UTC(y,h.m-1,h.d):easter(y)+h.o*DAY;}

  var cache={};
  function resetCache(){cache={};}
  function othersMap(y){
    var map={};
    HOL.forEach(function(h){ if(h.k!=="f-5-1" && state.off.indexOf(h.k)<0) map[holMs(h,y)]=h.n; });
    return map;
  }
  function mayShift(y,map){
    var ms=Date.UTC(y,4,1);
    for(var g=0;g<14 && (state.days.indexOf(new Date(ms).getUTCDay())<0 || map[ms]);g++) ms+=DAY;
    return ms;
  }
  function yearMap(y){
    if(cache[y]) return cache[y];
    var map=othersMap(y);
    if(state.off.indexOf("f-5-1")<0){
      var ms=mayShift(y,map);
      map[ms]=ms===Date.UTC(y,4,1)?"Πρωτομαγιά":"Πρωτομαγιά (μετακινήθηκε από 1/5)";
    }
    cache[y]=map; return map;
  }
  function customMap(){
    var m={};
    state.custom.forEach(function(c){var ms=parseISO(c.date); if(ms!==null) m[ms]=c.name||"Δική σου αργία";});
    return m;
  }

    function getAbsDates(r){
    if(Array.isArray(r.absDates)) return r.absDates.filter(function(d){return parseISO(d)!==null;});
    return [];
  }
  function absOf(r){
    if(Array.isArray(r.absDates)) return getAbsDates(r).length;
    var v=parseInt(r.abs,10); return (v>=0&&v<=5)?v:0;
  }
  function absMapFor(r){
    var m={};
    getAbsDates(r).forEach(function(d){var ms=parseISO(d); if(ms!==null) m[ms]="Απουσία";});
    return m;
  }
  function extraCountFor(r){
    return Array.isArray(r.absDates)?0:absOf(r);
  }
  function workSet(){var w={}; state.days.forEach(function(d){w[d]=true;}); return w;}
  function ctx(){return {n:N,work:workSet(),cm:customMap(),ok:state.days.length===4};}
  function endFor(s,n,work,cm,am){
    am=am||{};
    function hn(ms){return cm[ms]||yearMap(new Date(ms).getUTCFullYear())[ms]||null;}
    var d=s,count=0,guard=0,skipped=[],absSkipped=[],idx={};
    if(work[new Date(d).getUTCDay()]){
      var h0=hn(d);
      if(h0) skipped.push({ms:d,name:h0});
      else if(am[d]) absSkipped.push(d);
      else {count=1; idx[d]=1;}
    }
    while(count<n && guard<200000){
      guard++; d+=DAY;
      if(!work[new Date(d).getUTCDay()]) continue;
      var h=hn(d);
      if(h){skipped.push({ms:d,name:h}); continue;}
      if(am[d]){absSkipped.push(d); continue;}
      count++; idx[d]=count;
    }
    return {end:d,skipped:skipped,absSkipped:absSkipped,idx:idx};
  }



  var allTabs=document.querySelectorAll('[role="tab"]');
  var allPanels=document.querySelectorAll('[role="tabpanel"]');
  var pendingCal=null;
  function show(which){
    allTabs.forEach(function(t){
      var on=(t.id==="tab-"+which);
      t.setAttribute("aria-selected",on?"true":"false");
    });
    allPanels.forEach(function(p){
      p.hidden=(p.id!=="p-"+which);
    });
    if(which==="team") refreshTeam();
  }
  allTabs.forEach(function(t){
    t.addEventListener("click",function(){
      show(t.id.replace("tab-",""));
    });
  });

  var box=document.getElementById("days"), dstat=document.getElementById("dstat");
  function syncDays(){
    box.innerHTML="";
    WD.forEach(function(label,idx){
      var dw=idx+1, lbl=document.createElement("label"); lbl.className="day";
      var inp=document.createElement("input"); inp.type="checkbox"; inp.checked=state.days.indexOf(dw)>=0;
      if(!inp.checked && state.days.length>=4) inp.disabled=true;
      inp.addEventListener("change",function(){
        var p=state.days.indexOf(dw);
        if(inp.checked && p<0) state.days.push(dw);
        else if(!inp.checked && p>=0) state.days.splice(p,1);
        state.days.sort(); resetCache(); save(); syncDays(); renderOfficial(); refreshTeam();
      });
      var sp=document.createElement("span"); sp.textContent=label;
      lbl.appendChild(inp); lbl.appendChild(sp); box.appendChild(lbl);
    });
    dstat.textContent=state.days.length===4?"Επιλεγμένες 4 εργάσιμες ημέρες.":"Επίλεξε "+ (4-state.days.length) +" ακόμα ημέρες (σύνολο 4).";
    dstat.className="stat"+(state.days.length===4?"":" bad");
  }

  var syIn=document.getElementById("sy"), sypv=document.getElementById("sypv"), sylead=document.getElementById("sylead");
  function updateSYText(){
    syIn.value=syLabel();
    sypv.textContent="Διάστημα σχολικού έτους: 01/09/"+state.sy+" έως 31/08/"+(state.sy+1)+".";
    sylead.textContent=" ("+syLabel()+")"; sylead.hidden=false;
  }
  syIn.addEventListener("change",function(){
    var m=/^(\d{4})/.exec(syIn.value.trim());
    if(m && +m>=1990 && +m<=2098){ state.sy=+m; resetCache(); save(); updateSYText(); renderOfficial(); refreshTeam(); }
    else updateSYText();
  });


  var tbody=document.getElementById("tbody"), tstat=document.getElementById("tstat"), tmsg=document.getElementById("tmsg"), tcsv=document.getElementById("tcsv");
  function refreshTeam(){
    var c=ctx();
    tstat.hidden=c.ok;
    if(!c.ok) tstat.textContent="Προσοχή: Πρέπει να επιλέξεις ακριβώς 4 εργάσιμες ημέρες στις Ρυθμίσεις για να υπολογιστεί η λήξη.";
    renderTeam();
  }
  function renderTeam(){
    teamInit(); tbody.innerHTML="";
    var c=ctx();
    state.team.forEach(function(r,i){
            var tr=document.createElement("tr");
      if(r.off) tr.classList.add("inactive-row");

      var td0=document.createElement("td"); td0.textContent=i+1; tr.appendChild(td0);

      var tdName=document.createElement("td"); tdName.className="c-name";
      var inName=document.createElement("input"); inName.type="text"; inName.value=r.name||""; inName.placeholder="Ονοματεπώνυμο";
      inName.addEventListener("input",function(){r.name=inName.value; save();});
      tdName.appendChild(inName); tr.appendChild(tdName);

      var tdDate=document.createElement("td"); tdDate.className="c-date";
      var inDate=document.createElement("input");
      var sMs=parseISO(r.start);
      inDate.value=sMs!==null?dmy(sMs):"";
      flagSY(inDate,sMs);
      function onDateChange(ms){ r.start=ms!==null?iso(ms):""; flagSY(inDate,ms); save(); updateRowEnd(tr,r,c); }
      maskInput(inDate,onDateChange);
      tdDate.appendChild(withPicker(inDate,onDateChange));
      tr.appendChild(tdDate);

            var tdAbs=document.createElement("td"); tdAbs.className="c-abs";
      var absWrap=document.createElement("div"); absWrap.className="c-abs-wrap";
      var absCnt=document.createElement("span");
      function syncAbsBadge(){
        var cnt=absOf(r);
        absCnt.textContent=cnt+"/5";
        absCnt.className="abs-badge"+(cnt>0?" has-abs":"");
      }
      syncAbsBadge();
      var bAbs=document.createElement("button"); bAbs.type="button"; bAbs.className="sec sm";
      bAbs.textContent="Ημερομηνίες";
      bAbs.addEventListener("click",function(){
        openAbsModal(i,function(){ syncAbsBadge(); updateRowEnd(tr,r,c); });
      });
      absWrap.appendChild(absCnt); absWrap.appendChild(bAbs);
      tdAbs.appendChild(absWrap); tr.appendChild(tdAbs);

      var tdEnd=document.createElement("td"); tdEnd.className="rs";
      tr.appendChild(tdEnd);
      updateRowEnd(tr,r,c);

      var tdView=document.createElement("td"); tdView.className="bc";
      var bCal=document.createElement("button"); bCal.type="button"; bCal.className="sec sm"; bCal.textContent="Ημερολόγιο";
      bCal.addEventListener("click",function(){openCalendar(i);});
      var bMon=document.createElement("button"); bMon.type="button"; bMon.className="sec sm"; bMon.textContent="Ημέρες/Μήνα";
      bMon.addEventListener("click",function(){openMonths(i);});
      tdView.appendChild(bCal); tdView.appendChild(bMon); tr.appendChild(tdView);

      var tdOff=document.createElement("td"); tdOff.style.textAlign="center";
      var chkOff=document.createElement("input"); chkOff.type="checkbox"; chkOff.checked=!!r.off;
      chkOff.addEventListener("change",function(){
        r.off=chkOff.checked;
        if(r.off) tr.classList.add("inactive-row"); else tr.classList.remove("inactive-row");
        save();
      });
      tdOff.appendChild(chkOff); tr.appendChild(tdOff);
      tbody.appendChild(tr);
    });
  }

  function openAbsModal(i,onDone){
    var r=state.team[i];
    if(!Array.isArray(r.absDates)) r.absDates=[];
    var adlg=document.getElementById("adlg");
    if(!adlg){
      adlg=document.createElement("dialog"); adlg.id="adlg";
      adlg.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><h3 id="attl" style="margin:0;font-size:17px;"></h3><button type="button" id="aclose" class="sec sm">Κλείσιμο</button></div><p class="hint" style="margin:6px 0 0 0;font-size:13px;">Καταχώρισε έως 5 ημερομηνίες απουσίας. Δεν προσμετρώνται στις 156 εργάσιμες.</p><div id="abody" class="abs-list"></div><div id="awarn" class="abs-warn" hidden></div>';
      document.body.appendChild(adlg);
      document.getElementById("aclose").addEventListener("click",function(){
        if(adlg.close) adlg.close(); else adlg.removeAttribute("open");
      });
    }
    document.getElementById("attl").textContent="Απουσίες – "+(r.name||"Άτομο "+(i+1));
    var body=document.getElementById("abody"), warn=document.getElementById("awarn");
    body.innerHTML="";
    var vals=r.absDates.slice(0,5);
    while(vals.length<5) vals.push("");

    function persist(){
      var clean=[], seen={};
      vals.forEach(function(v){ if(v && !seen[v]){ seen[v]=true; clean.push(v); } });
      clean.sort();
      r.absDates=clean; r.abs=clean.length;
      save();
      // Έλεγχος για τυχόν αργίες ή μη εργάσιμες
      var c=ctx(), cm=customMap(), sMs=parseISO(r.start), notes=[];
      clean.forEach(function(isoStr){
        var ms=parseISO(isoStr); if(ms===null) return;
        var dw=new Date(ms).getUTCDay(), ym=yearMap(new Date(ms).getUTCFullYear());
        if(sMs!==null && ms<sMs) notes.push("Η "+dmy(ms)+" είναι πριν την έναρξη.");
        else if(!c.work[dw] || cm[ms] || ym[ms]) notes.push("Η "+dmy(ms)+" είναι ήδη αργία/μη εργάσιμη.");
      });
      warn.hidden=!notes.length;
      warn.textContent=notes.join(" ");
      if(onDone) onDone();
    }

    vals.forEach(function(val,idx){
      var row=document.createElement("div"); row.className="abs-row";
      var lbl=document.createElement("label"); lbl.textContent=(idx+1)+"η απουσία:";
      var inp=document.createElement("input");
      var ms0=parseISO(val); inp.value=ms0!==null?dmy(ms0):"";
      function onChg(ms){ vals[idx]=(ms!==null?iso(ms):""); persist(); }
      maskInput(inp,onChg);
      var bClr=document.createElement("button"); bClr.type="button"; bClr.className="abs-clr"; bClr.textContent="✕"; bClr.title="Διαγραφή ημερομηνίας";
      bClr.addEventListener("click",function(){ inp.value=""; inp.setAttribute("aria-invalid","false"); onChg(null); });
      row.appendChild(lbl); row.appendChild(withPicker(inp,onChg)); row.appendChild(bClr);
      body.appendChild(row);
    });
    persist();
    if(adlg.showModal) adlg.showModal(); else adlg.setAttribute("open","");
  }

  function updateRowEnd(tr,r,c){
    var tdEnd=tr.querySelector(".rs");
    var s=parseISO(r.start);
    if(s===null || !c.ok){tdEnd.innerHTML="—"; return;}
    var e=endFor(s,c.n+extraCountFor(r),c.work,c.cm,absMapFor(r));
    tdEnd.innerHTML='<div class="rd">'+dmy(e.end)+'</div><div class="rw">'+WDF[new Date(e.end).getUTCDay()]+'</div>';
  }

  function updateRowEnd(tr,r,c){
    var tdEnd=tr.querySelector(".rs");
    var s=parseISO(r.start);
    if(s===null || !c.ok){tdEnd.innerHTML="—"; return;}
    var e=endFor(s,c.n+absOf(r),c.work,c.cm);
    tdEnd.innerHTML='<div class="rd">'+dmy(e.end)+'</div><div class="rw">'+WDF[new Date(e.end).getUTCDay()]+'</div>';
  }


  function sortTeam(announce){
    var by=state.sort, dir=(state.dir==="desc"?-1:1), c=ctx();
    function key(r){
      if(by==="name"){var nm=(r.name||"").trim(); return nm?nm.toLocaleLowerCase("el"):null;}
      var s=parseISO(r.start); if(s===null) return null;
      if(by==="start") return s;
      if(!c.ok) return null;
      return endFor(s,c.n+absOf(r),c.work,c.cm).end;
    }
    var keyed=state.team.map(function(r,i){return {r:r,k:key(r),i:i};});
    keyed.sort(function(a,b){
      if(a.k===null && b.k===null) return a.i-b.i;
      if(a.k===null) return 1;
      if(b.k===null) return -1;
      var cmp=(typeof a.k==="string")?a.k.localeCompare(b.k,"el"):(a.k-b.k);
      return cmp!==0?cmp*dir:a.i-b.i;
    });
    state.team=keyed.map(function(x){return x.r;}); save(); renderTeam(); updateSortUI();
    if(announce) tmsg.textContent="Ο πίνακας ταξινομήθηκε κατά "+({name:"Ονοματεπώνυμο",start:"ημερομηνία έναρξης",end:"ημερομηνία λήξης"}[by])+".";
  }
  function updateSortUI(){
    [].slice.call(document.querySelectorAll(".sorth")).forEach(function(b){
      var on=(b.dataset.sort===state.sort), ar=b.querySelector(".arr");
      ar.textContent=on?(state.dir==="desc"?"▼":"▲"):"⇅"; ar.className="arr"+(on?"":" off");
      b.parentNode.setAttribute("aria-sort",on?(state.dir==="desc"?"descending":"ascending"):"none");
    });
  }
  [].slice.call(document.querySelectorAll(".sorth")).forEach(function(b){
    b.addEventListener("click",function(){
      if(state.sort===b.dataset.sort) state.dir=(state.dir==="desc"?"asc":"desc");
      else { state.sort=b.dataset.sort; state.dir="asc"; }
      save(); sortTeam(true);
    });
  });

  var dlg=document.getElementById("mdlg");
  document.getElementById("mclose").addEventListener("click",function(){ if(dlg.close) dlg.close(); else dlg.removeAttribute("open"); });
  function mkey(ms){var d=new Date(ms); return d.getUTCFullYear()*12+d.getUTCMonth();}
    function openMonths(i){
    var r=state.team[i], c=ctx(), s=parseISO(r.start);
    if(s===null||!c.ok) return;
    var am=absMapFor(r), e=endFor(s,c.n+extraCountFor(r),c.work,c.cm,am);
    var cnt={}, hol={}, abm={}, k;
    for(k in e.idx){ var kk=mkey(+k); cnt[kk]=(cnt[kk]||0)+1; }
    e.skipped.forEach(function(x){ var kh=mkey(x.ms); hol[kh]=(hol[kh]||0)+1; });
    getAbsDates(r).forEach(function(isoStr){
      var ms=parseISO(isoStr);
      if(ms!==null){ var ka=mkey(ms); abm[ka]=(abm[ka]||0)+1; }
    });
    var first=Math.min(state.sy*12+8,mkey(s)), last=Math.max((state.sy+1)*12+7,mkey(e.end));
    document.getElementById("mttl").textContent="Εργάσιμες ανά μήνα – "+(r.name||"Άτομο "+(i+1));
    var body=document.getElementById("mbody"); body.innerHTML="";
    var info=document.createElement("p"); info.className="hint"; info.style.margin="0";
    info.textContent="Έναρξη: "+fmtW(s)+" · Λήξη: "+fmtW(e.end)+".";
    body.appendChild(info);
    var tb=document.createElement("table"); tb.className="mt";
    tb.innerHTML="<thead><tr><th>Μήνας</th><th>Εργάσιμες</th><th>Αργίες</th><th>Απουσίες</th><th>Σωρευτικά</th></tr></thead>";
    var bd=document.createElement("tbody"), cum=0, th2=0, ta=0;
    for(var m=first;m<=last;m++){
      var y=Math.floor(m/12), mo=m%12, n=cnt[m]||0, h=hol[m]||0, ab=abm[m]||0;
      cum+=n; th2+=h; ta+=ab;
      var tr=document.createElement("tr");
      var label=new Intl.DateTimeFormat("el-GR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(y,mo,1)));
      [label,n||"—",h||"—",ab||"—",cum||"—"].forEach(function(v,ci){
        var td=document.createElement("td");
        if(ci===1 && n){
          var bt=document.createElement("button"); bt.type="button";
          bt.className="cellbtn"+(ab>0?" has-abs-month":"");
          bt.textContent=v;
          if(ab>0) bt.title="Ο μήνας περιλαμβάνει "+ab+(ab===1?" απουσία":" απουσίες");
          bt.dataset.mk=String(m);
          bt.addEventListener("click",function(){ if(dlg.close) dlg.close(); else dlg.removeAttribute("open"); openCalendar(i,+bt.dataset.mk,true); });
          td.appendChild(bt);
        } else if(ci===3 && ab){
          var sp=document.createElement("span"); sp.className="abs-month-badge"; sp.textContent=v;
          td.appendChild(sp);
        } else td.textContent=v;
        tr.appendChild(td);
      });
      bd.appendChild(tr);
    }
    tb.appendChild(bd);
    var tf=document.createElement("tfoot"), trf=document.createElement("tr");
    ["Σύνολο",cum,th2||"—",ta||"—",""].forEach(function(v){var t=document.createElement("th"); t.textContent=v; trf.appendChild(t);});
    tf.appendChild(trf); tb.appendChild(tf); body.appendChild(tb);
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
  }




  function q(v){return '"'+String(v).replace(/"/g,'""')+'"';}
  function parseLine(l){
    var out=[],cur="",inq=false;
    for(var i=0;i<l.length;i++){
      var ch=l.charAt(i);
      if(inq){ if(ch==='"'){ if(l.charAt(i+1)==='"'){cur+='"';i++;} else inq=false; } else cur+=ch; }
      else if(ch==='"') inq=true;
      else if(ch===";"){out.push(cur);cur="";}
      else cur+=ch;
    }
    out.push(cur); return out;
  }
  document.getElementById("tcsvb").addEventListener("click",function(){
    var c=ctx();
    var rows=[["Α/Α","Ονοματεπώνυμο","Έναρξη","Απουσίες","Η "+c.n+"η εργάσιμη"].map(q).join(";")];
    state.team.forEach(function(r,i){
      if(!r.name && !r.start) return;
      var s=parseISO(r.start), e=(s!==null && c.ok)?endFor(s,c.n+absOf(r),c.work,c.cm):null;
      rows.push([i+1,r.name,s===null?"":dmy(s),absOf(r),e?dmy(e.end):""].map(q).join(";"));
    });
    tcsv.value=rows.join("\n"); tcsv.select();
    tmsg.textContent="Το CSV είναι έτοιμο στο πλαίσιο.";
    try{ navigator.clipboard.writeText(tcsv.value); }catch(e){}
  });
    document.getElementById("tload").addEventListener("click",function(){
    var got=[];
        function ab(v){return /^\s*[0-5]\s*$/.test(v||"")?+v:0;}
    tcsv.value.split(/\r?\n/).forEach(function(l){
      if(!l.trim() || got.length>=TEAM) return;
      var c=parseLine(l), a=c.length>=4?parseAny(c.at(2)):null;
      if(a!==null) got.push({name:c.at(1),start:iso(a),abs:c.length>=6?ab(c.at(4)):ab(c.at(3))});
      else { var b=c.length>=2?parseAny(c.at(1)):null; if(b!==null) got.push({name:c.at(0),start:iso(b),abs:ab(c.at(2))}); }
    });
    if(!got.length){tmsg.textContent="Δεν βρέθηκαν έγκυρες γραμμές."; return;}
    state.team=got; save(); sortTeam(false);
    tmsg.textContent="Φορτώθηκαν "+got.length+" άτομα.";
  });
  var clr=document.getElementById("tclear"), clrT;

  clr.addEventListener("click",function(){
    if(clr.dataset.arm!=="1"){
      clr.dataset.arm="1"; clr.textContent="Πάτα ξανά για επιβεβαίωση";
      clrT=setTimeout(function(){clr.dataset.arm="0"; clr.textContent="Καθαρισμός όλων";},4000);
      return;
    }
    clearTimeout(clrT); clr.dataset.arm="0"; clr.textContent="Καθαρισμός όλων";
    state.team=[]; save(); renderTeam();
  });


  var calPerson=document.createElement("select");
  var focusKey=null, focusEl=null;
  var cdlg=document.getElementById("cdlg");
  document.getElementById("cclose").addEventListener("click",function(){ if(cdlg.close) cdlg.close(); else cdlg.removeAttribute("open"); });
  var backTo=null;
  cdlg.addEventListener("close",function(){ if(backTo!==null){ var bi=backTo; backTo=null; openMonths(bi); } });
  function openCalendar(i,mk,back){
    backTo=back?i:null; pendingCal=i; focusKey=(mk===undefined?null:mk); focusEl=null; prepCalendar();
    var r=state.team[i];
    document.getElementById("calttl").textContent="Ημερολόγιο – "+(r.name||"Άτομο "+(i+1));
    if(cdlg.showModal) cdlg.showModal(); else cdlg.setAttribute("open","");
    if(focusEl){ try{focusEl.scrollIntoView({block:"center"});}catch(e){} }
  }
  function prepCalendar(){
    var prev=calPerson.value; calPerson.innerHTML="";
    var o0=document.createElement("option"); o0.value="-1"; o0.textContent="Χωρίς επισήμανση"; calPerson.appendChild(o0);
    var first=-1;
    state.team.forEach(function(r,i){
      var ms=parseISO(r.start); if(ms===null) return;
      if(first<0) first=i;
      var o=document.createElement("option"); o.value=String(i); o.textContent=(r.name||"Άτομο "+(i+1))+" – "+dmy(ms); calPerson.appendChild(o);
    });
    var want=pendingCal!==null?String(pendingCal):prev;
    pendingCal=null;
    calPerson.value=(want && calPerson.querySelector('option[value="'+want+'"]'))?want:String(first);
    renderCalendar();
  }
     function renderCalendar(){
       // 1. Πάνω μέρος της renderCalendar:
    if(pi>=0 && c.ok){
      sMs=parseISO(state.team[pi].start);
      am=absMapFor(state.team[pi]);
      if(sMs!==null) r=endFor(sMs,c.n+extraCountFor(state.team[pi]),c.work,cm,am);
    }


 var out=document.getElementById("months"), info=document.getElementById("calinfo");
    out.innerHTML="";
        // Προσθήκη ένδειξης "Απουσία" στη γραμμή του υπομνήματος
    var legRow=cdlg.querySelector(".leg")||cdlg.querySelector("div:first-child > div:last-child");
    if(legRow && !legRow.querySelector(".leg-abs-item")){
      var sp=document.createElement("span");
      sp.className="leg-abs-item";
      sp.innerHTML='<i class="leg-abs-box"></i><span>Απουσία</span>';
      legRow.appendChild(sp);
    }

    var Y=state.sy;
    var c=ctx(), cm=customMap(), pi=+calPerson.value, r=null, sMs=null, am={};
    if(pi>=0 && c.ok){
      sMs=parseISO(state.team[pi].start);
      am=absMapFor(state.team[pi]);
      if(sMs!==null) r=endFor(sMs,c.n+extraCountFor(state.team[pi]),c.work,cm,am);
    }
    info.textContent="Σχολικό έτος "+syLabel()+". "+(!c.ok ? "Επίλεξε ακριβώς 4 εργάσιμες ημέρες στις Ρυθμίσεις." : (r ? "Έναρξη: "+fmtW(sMs)+". Η "+c.n+"η εργάσιμη: "+fmtW(r.end)+"." : ""));
    var monthBg=["#eef5fc","#f2f0fc","#eef8f4","#f3f8ee","#fbf8ec","#fdf4ec","#fcf0f0","#fdf6ec","#f0f7f4","#fdf3eb","#f4f1f8","#edf6fa"];
    var keys=[]; for(var kq0=Y*12+8;kq0<=(Y+1)*12+7;kq0++) keys.push(kq0);
    if(focusKey!==null && keys.indexOf(focusKey)<0){ keys.push(focusKey); keys.sort(function(a,b){return a-b;}); }
    keys.forEach(function(kq){
      var m=kq%12, y=Math.floor(kq/12);
      var wrap=document.createElement("div");
      wrap.style.backgroundColor=monthBg[m];
      var h=document.createElement("div"); h.className="mh";
      h.textContent=new Intl.DateTimeFormat("el-GR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(y,m,1)));
      wrap.appendChild(h);
      var g=document.createElement("div"); g.className="cg";
      ["Δ","Τ","Τ","Π","Π","Σ","Κ"].forEach(function(l){var e=document.createElement("div"); e.className="wh"; e.textContent=l; g.appendChild(e);});
      var off=(new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7;
      for(var k=0;k<off;k++) g.appendChild(document.createElement("div"));
      var dim=new Date(Date.UTC(y,m+1,0)).getUTCDate(), ym=yearMap(y);
      for(var day=1;day<=dim;day++){
        var ms=Date.UTC(y,m,day), dw=new Date(ms).getUTCDay();
        var cell=document.createElement("div"), cls="c", name=cm[ms]||ym[ms]||null;
        var num=document.createElement("span"); num.textContent=day; cell.appendChild(num);
    // 2. Μέσα στις ημέρες του μήνα:
    if(name){cls+=" hol"; cell.title=name;}
    if(am[ms]){cls+=" abs"; cell.title="Απουσία μαθητευόμενου"; cell.style.backgroundColor="#e0e7ff";}

        if(dw===0) cls+=" sun"; else if(!c.work[dw]) cls+=" off";
        if(name){cls+=" hol"; cell.title=name;}
        if(am[ms]){cls+=" abs"; cell.title="Απουσία μαθητευόμενου";}
        if(r){
          if(r.idx[ms]){cls+=" cnt"; var cn=document.createElement("span"); cn.className="cn"; cn.textContent=r.idx[ms]; cell.appendChild(cn);}
          if(ms===sMs) cls+=" st";
          if(ms===r.end) cls+=" en";
        }
        cell.className=cls; g.appendChild(cell);
      }
      if(kq===focusKey){wrap.style.outline="3px solid var(--c2)"; wrap.style.outlineOffset="2px"; focusEl=wrap;}
      wrap.appendChild(g); out.appendChild(wrap);
    });
  }





  var offBox=document.getElementById("official");
  function renderOfficial(){
    var y=state.sy+1;
    offBox.innerHTML="";
        [["f","Σταθερές αργίες"],["e","Κινητές αργίες (Πάσχα "+dmy(easter(y))+")"]].forEach(function(gr){
      var hd=document.createElement("div"); hd.className="group-h"; hd.textContent=gr.at(1); offBox.appendChild(hd);
      HOL.filter(function(x){return x.g===gr.at(0);}).forEach(function(x){

        var row=document.createElement("label"); row.className="hol";
        var c=document.createElement("input"); c.type="checkbox"; c.checked=state.off.indexOf(x.k)<0;
        c.addEventListener("change",function(){
          var i=state.off.indexOf(x.k);
          if(c.checked){ if(i>=0) state.off.splice(i,1); } else if(i<0){ state.off.push(x.k); }
          resetCache(); save();
        });
        var nm=document.createElement("span"); nm.className="nm"; nm.textContent=x.n;
        var dt=document.createElement("span"); dt.className="dt";
        dt.textContent=fmtW(x.k==="f-5-1"?mayShift(y,othersMap(y)):holMs(x,(x.g==="f"&&x.m>=9)?state.sy:y));
        row.appendChild(c); row.appendChild(nm); row.appendChild(dt); offBox.appendChild(row);
      });
    });
  }
  document.getElementById("all").addEventListener("click",function(){state.off=[]; resetCache(); save(); renderOfficial();});
  document.getElementById("none").addEventListener("click",function(){state.off=HOL.map(function(h){return h.k;}); resetCache(); save(); renderOfficial();});
  document.getElementById("reset").addEventListener("click",function(){state.off=DEFAULT_OFF.slice(); resetCache(); save(); renderOfficial();});

  var cBox=document.getElementById("custom"), cMs=null, cIn=document.getElementById("cdate");
  maskInput(cIn,function(v){cMs=v;});
  (function(){var par=cIn.parentNode; par.appendChild(withPicker(cIn,function(ms){cMs=ms;}));})();
  function renderCustom(){
    cBox.innerHTML="";
    if(!state.custom.length){var e=document.createElement("p"); e.className="hint"; e.textContent="Δεν έχεις προσθέσει δικές σου αργίες."; cBox.appendChild(e); return;}
    state.custom.slice().sort(function(a,b){return a.date<b.date?-1:1;}).forEach(function(c){
      var ms=parseISO(c.date); if(ms===null) return;
      var row=document.createElement("div"); row.className="hol";
      var nm=document.createElement("span"); nm.className="nm"; nm.textContent=c.name||"Δική σου αργία";
      var dt=document.createElement("span"); dt.className="dt"; dt.textContent=fmtW(ms);
      var b=document.createElement("button"); b.className="link"; b.type="button"; b.textContent="Διαγραφή";
      b.addEventListener("click",function(){
        state.custom=state.custom.filter(function(x){return !(x.date===c.date && x.name===c.name);}); save(); renderCustom(); refreshTeam();
      });
      row.appendChild(nm); row.appendChild(dt); row.appendChild(b); cBox.appendChild(row);
    });
  }
  var cmsg=document.getElementById("cmsg");
  document.getElementById("cadd").addEventListener("click",function(){
    if(cMs===null){cIn.setAttribute("aria-invalid","true"); cmsg.textContent="Γράψε έγκυρη ημερομηνία στη μορφή ηη/μμ/εεεε."; return;}
    var dv=iso(cMs), ds=dmy(cMs), nv=document.getElementById("cname").value.trim();
    if(state.custom.some(function(x){return x.date===dv && x.name===nv;})){cmsg.textContent="Η αργία υπάρχει ήδη."; return;}
    state.custom.push({date:dv,name:nv});
    cIn.value=""; cIn.dispatchEvent(new Event("input"));
    document.getElementById("cname").value=""; save(); renderCustom(); refreshTeam();
    cmsg.textContent="Η αργία "+ds+(nv?" ("+nv+")":"")+" προστέθηκε.";
  });

  updateSYText(); renderOfficial(); renderCustom(); syncDays(); sortTeam(false);

  document.getElementById("texcel").addEventListener("click", function() {
    function escXml(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function buildRows(rows) {
      return rows.map(function(row, rIdx) {
        var cells = row.map(function(val) {
          var isNum = (typeof val === "number" && !isNaN(val));
          return '<Cell' + (rIdx === 0 ? ' ss:StyleID="hdr"' : "") + '><Data ss:Type="' + (isNum ? "Number" : "String") + '">' + escXml(val) + '</Data></Cell>';
        }).join("");
        return "<Row>" + cells + "</Row>";
      }).join("\n");
    }
    var c = ctx();
    var sheet1Data = [["Ονοματεπώνυμο", "Έναρξη", "Απουσίες", "Ημερομηνία Λήξης", "Ημέρα Λήξης"]];
    state.team.forEach(function(r) {
      if (!r.name && !r.start) return;
      var s = parseISO(r.start), e = (s !== null && c.ok) ? endFor(s, c.n + absOf(r), c.work, c.cm) : null;
      sheet1Data.push([r.name, s === null ? "" : dmy(s), absOf(r), e ? dmy(e.end) : "", e ? WDF[new Date(e.end).getUTCDay()] : ""]);
    });
    var sheet2Data = [["Ημερομηνία", "Ημέρα", "Περιγραφή", "Τύπος"]];
    [state.sy, state.sy + 1].forEach(function(yr) {
      var ym = yearMap(yr);
      Object.keys(ym).sort().forEach(function(msStr) {
        var ms = +msStr;
        if (ms >= syStart() && ms <= syEnd()) sheet2Data.push([dmy(ms), WDF[new Date(ms).getUTCDay()], ym[ms], "Επίσημη"]);
      });
    });
    state.custom.forEach(function(ch) {
      var ms = parseISO(ch.date);
      if (ms !== null) sheet2Data.push([dmy(ms), WDF[new Date(ms).getUTCDay()], ch.name || "Προσωπική αργία", "Προσωπική"]);
    });
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#E1EBE8" ss:Pattern="Solid"/></Style></Styles>\n<Worksheet ss:Name="Τμήμα"><Table><Column ss:Width="180"/><Column ss:Width="95"/><Column ss:Width="75"/><Column ss:Width="115"/><Column ss:Width="105"/>\n' + buildRows(sheet1Data) + '\n</Table></Worksheet>\n<Worksheet ss:Name="Αργίες"><Table><Column ss:Width="95"/><Column ss:Width="95"/><Column ss:Width="280"/><Column ss:Width="140"/>\n' + buildRows(sheet2Data) + '\n</Table></Worksheet>\n</Workbook>';
    var blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    var a = document.createElement("a"), outName = "Mathiteia_" + syLabel().replace("–", "-") + ".xls";
    a.href = URL.createObjectURL(blob); a.download = outName; a.click();
    tmsg.textContent = "Το αρχείο Excel (" + outName + ") δημιουργήθηκε.";
  });
})();








