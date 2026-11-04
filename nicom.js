/* Nicom System · lógica compartida de la tienda: catálogo, carrito, pedido por WhatsApp. Cada página usa solo lo que tiene. */
/* ===== CONFIGURACIÓN (único lugar para cambiar datos) ===== */
var CFG={
  url:'https://tkhzuopapvclmcgxyood.supabase.co',
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraHp1b3BhcHZjbG1jZ3h5b29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDAzNTIsImV4cCI6MjEwMzc3NjM1Mn0.26o1jnPJzcokhweNiMpOB5A3rsUE3ZjxVV9YucD9ByU',
  slug:'nicom',
  wa:'584242342204',
  pagina:24
};
var CHIPS=['Cámaras y CCTV','Control de acceso','UPS y energía','Redes','Laptops','Desktops','Monitores','Impresoras','Componentes de PC','Almacenamiento y memoria','Audio y sonido','Accesorios','Software y licencias'];
var CONTEO=['Cámaras y CCTV','Control de acceso','UPS y energía','Redes','Software y licencias','Laptops'];
var LIST='id,nombre,categoria,imagen_url,stock,precio_efectivo_usd,precio_bs,bajo_de_precio,precio_anterior_usd';

var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function okUrl(u){return typeof u==='string'&&/^https:\/\//i.test(u)?u:''}
function usd(n){return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function bs(n){return 'Bs. '+Number(n).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}
function waUrl(t){return 'https://wa.me/'+CFG.wa+'?text='+encodeURIComponent(t)}
function toast(t){var e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.remove('on')},2200)}
/* Nombre legible: quita códigos [entre corchetes] y pasa MAYÚSCULAS a minúsculas, sin tocar la base de datos */
var MIN={de:1,del:1,con:1,para:1,y:1,en:1,la:1,el:1,los:1,las:1,por:1,a:1,o:1,un:1,una:1};
function limpio(n){
  n=String(n==null?'':n).replace(/\s*\[[^\]]*\]\s*/g,' ').replace(/\s+/g,' ').trim();
  var L=n.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,'');
  if(!L||L.replace(/[^A-ZÁÉÍÓÚÑ]/g,'').length/L.length<0.7)return n;
  return n.split(' ').map(function(w,i){
    var b=w.toLowerCase();
    if(i>0&&MIN[b])return b;
    if(/\d/.test(w)||(w.length<=3&&w===w.toUpperCase()))return w;
    return w.charAt(0)+w.slice(1).toLowerCase();
  }).join(' ');
}
/* Producto sin foto: se muestra el logo de Nicom en tenue */
var PH='<img class="phl" src="img/logo-nicom.png" alt="">';

/* ===== WhatsApp en todos los botones con data-wa ===== */
$$('[data-wa]').forEach(function(a){a.href=waUrl(a.getAttribute('data-wa'));a.target='_blank'});

/* ===== Menú móvil ===== */
$('#burger').onclick=function(){var m=$('#mmenu'),o=m.classList.toggle('open');this.setAttribute('aria-expanded',o)};
$$('#mmenu a').forEach(function(a){a.addEventListener('click',function(){$('#mmenu').classList.remove('open')})});

/* ===== Acceso a datos (solo lectura de vistas públicas) ===== */
function api(path,extra){
  var h={apikey:CFG.key,Authorization:'Bearer '+CFG.key};
  if(extra)for(var k in extra)h[k]=extra[k];
  return fetch(CFG.url+'/rest/v1/'+path,{headers:h});
}
var P={};
function guardar(arr){arr.forEach(function(p){P[p.id]=Object.assign(P[p.id]||{},p)})}

/* ===== Tarjeta de producto ===== */
function cardHtml(p){
  var img=okUrl(p.imagen_url),sin=!(p.stock>0);
  var tag=sin?'<span class="tag gris">Agotado</span>':(p.bajo_de_precio?'<span class="tag">Bajó de precio</span>':'');
  var anterior=(p.bajo_de_precio&&p.precio_anterior_usd)?'<s>'+usd(p.precio_anterior_usd)+'</s>':'';
  var btn=sin?'<a class="btn btn-verde" target="_blank" rel="noopener" href="'+esc(waUrl('Hola Nicom System, quiero consultar disponibilidad de: '+p.nombre.slice(0,120)))+'">Consultar disponibilidad</a>'
            :'<button class="btn btn-azul" data-add="'+esc(p.id)+'">Agregar al pedido</button>';
  return '<article class="card"><button class="card-img" data-open="'+esc(p.id)+'" aria-label="Ver detalle de '+esc(limpio(p.nombre))+'">'+(img?'<img src="'+esc(img)+'" alt="'+esc(limpio(p.nombre))+'" loading="lazy" onerror="this.outerHTML=PH">':PH)+tag+'</button>'
   +'<div class="card-b"><span class="cat">'+esc(p.categoria||'')+'</span><h3 data-open="'+esc(p.id)+'">'+esc(limpio(p.nombre))+'</h3>'
   +'<div class="price">'+usd(p.precio_efectivo_usd)+anterior+'</div><div class="iva">+ IVA'+(p.precio_bs?' · '+bs(p.precio_bs):'')+'</div>'+btn+'</div></article>';
}

/* ===== Hero: lista de productos que bajaron de precio + tasa usada ===== */
var V={i:0,d:[]};
function pintarV(){
  var p=V.d[V.i];if(!p)return;
  var im=okUrl(p.imagen_url);
  $('#vitImg').innerHTML=im?'<img src="'+esc(im)+'" alt="'+esc(limpio(p.nombre))+'">':PH;
  $('#vitImg').setAttribute('data-open',p.id);
  $('#vitCat').textContent=p.categoria||'';
  $('#vitN').textContent=(V.i+1)+' de '+V.d.length;
  $('#vitNom').textContent=limpio(p.nombre);
  $('#vitPrecio').innerHTML=usd(p.precio_efectivo_usd)+((p.bajo_de_precio&&p.precio_anterior_usd)?'<s>'+usd(p.precio_anterior_usd)+'</s>':'');
  $('#vitIva').textContent='+ IVA'+(p.precio_bs?' · '+bs(p.precio_bs):'');
  $('#vitAdd').setAttribute('data-add',p.id);
}
function setTasa(p){
  if(p&&p.precio_bs&&Number(p.precio_efectivo_usd)>0){var t=Number(p.precio_bs)/Number(p.precio_efectivo_usd);
    $('#franja').textContent='Precios en dólares, sin IVA. Los bolívares se calculan a Bs. '+t.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' por dólar.'}
}
function cargarVitrina(){
  api('vista_catalogo_publico?select='+LIST+'&tenant_slug=eq.'+CFG.slug+'&tiene_fotos=eq.true&stock=gt.0&order=bajo_de_precio.desc,precio_efectivo_usd.desc&limit=6')
  .then(function(r){if(!r.ok)throw 0;return r.json()})
  .then(function(d){
    d=d.filter(function(p){return okUrl(p.imagen_url)});
    if(!d.length)return;
    guardar(d);V.d=d;V.i=0;pintarV();setTasa(d[0]);
    $('#vit').hidden=false;$('#listaP').hidden=true;
    var multi=d.length>1;$('#vitPrev').hidden=$('#vitNext').hidden=!multi;
  }).catch(function(){});
}
if($('#vit')){
  $('#vitPrev').onclick=function(){V.i=(V.i+V.d.length-1)%V.d.length;pintarV()};
  $('#vitNext').onclick=function(){V.i=(V.i+1)%V.d.length;pintarV()};
}
function cargarBajaron(){
  api('vista_catalogo_publico?select=id,nombre,categoria,imagen_url,stock,precio_efectivo_usd,precio_bs,bajo_de_precio,precio_anterior_usd&tenant_slug=eq.'+CFG.slug+'&bajo_de_precio=eq.true&stock=gt.0&order=precio_efectivo_usd.desc&limit=5')
  .then(function(r){if(!r.ok)throw 0;return r.json()})
  .then(function(d){
    if(!d.length)return;
    guardar(d);
    $('#listaPItems').innerHTML=d.map(function(p){
      return '<button class="pl" data-open="'+esc(p.id)+'"><span class="pn">'+esc(limpio(p.nombre))+'</span><span class="pp"><s>'+usd(p.precio_anterior_usd||0)+'</s>'+usd(p.precio_efectivo_usd)+'</span></button>';
    }).join('');
    $('#listaP').hidden=!$('#vit').hidden;
    var t=d.filter(function(p){return p.precio_bs&&Number(p.precio_efectivo_usd)>0})[0];
    if(t){var tasa=Number(t.precio_bs)/Number(t.precio_efectivo_usd);
      $('#franja').textContent='Precios en dólares, sin IVA. Los bolívares se calculan a Bs. '+tasa.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' por dólar.'}
  }).catch(function(){});
}

/* ===== Tasa del día para la franja (páginas sin vitrina) ===== */
function cargarTasa(){
  api('vista_catalogo_publico?select=precio_bs,precio_efectivo_usd&tenant_slug=eq.'+CFG.slug+'&precio_bs=not.is.null&precio_efectivo_usd=gt.0&stock=gt.0&limit=1')
  .then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){if(d&&d[0])setTasa(d[0])}).catch(function(){});
}

/* ===== Conteo de productos por categoría (índice) ===== */
function cargarConteos(){
  if(!$('#n0'))return;
  CONTEO.forEach(function(c,i){
    api('vista_catalogo_publico?select=id&tenant_slug=eq.'+CFG.slug+'&stock=gt.0&categoria=eq.'+encodeURIComponent(c)+'&limit=1',{Prefer:'count=exact'})
    .then(function(r){var cr=r.headers.get('content-range'),n=cr&&cr.split('/')[1];if(n&&n!=='*'){$('#n'+i).textContent=Number(n).toLocaleString('es-VE')+' productos'}})
    .catch(function(){});
  });
}

/* ===== Destacados (con foto y stock) ===== */
function cargarDestacados(){
  if(!$('#gridDest'))return;
  api('vista_catalogo_publico?select='+LIST+'&tenant_slug=eq.'+CFG.slug+'&tiene_fotos=eq.true&stock=gt.0&order=bajo_de_precio.desc,precio_efectivo_usd.desc&limit=8')
  .then(function(r){if(!r.ok)throw 0;return r.json()})
  .then(function(d){
    if(!d.length){$('#destacados').hidden=true;return}
    guardar(d);$('#gridDest').innerHTML=d.map(cardHtml).join('');
  }).catch(function(){$('#destacados').hidden=true});
}

/* ===== Tienda ===== */
var S={cat:'',q:'',off:0,total:null,busy:false};
function armarFiltro(){
  var f='tenant_slug=eq.'+CFG.slug+'&stock=gt.0';
  if(S.cat)f+='&categoria=eq.'+encodeURIComponent(S.cat);
  if(S.q){var t=S.q.replace(/[,()*%\\"']/g,' ').trim().split(/\s+/).join('*');if(t)f+='&or=('+encodeURIComponent('nombre.ilike.*'+t+'*,sku.ilike.*'+t+'*')+')'}
  return f;
}
function falloTienda(){
  $('#estado').textContent='';
  $('#gridTienda').innerHTML='<div class="vacio" style="grid-column:1/-1">No pudimos cargar el catálogo en este momento.<br>Escríbenos y te atendemos de inmediato por WhatsApp.<br><a class="btn btn-verde" target="_blank" rel="noopener" href="'+esc(waUrl('Hola Nicom System, quiero cotizar: ____.'))+'">Cotizar por WhatsApp</a></div>';
  $('#btnMas').hidden=true;
}
function cargarTienda(reset){
  if(S.busy)return;S.busy=true;
  if(reset){S.off=0;S.total=null;$('#gridTienda').innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';$('#btnMas').hidden=true}
  api('vista_catalogo_publico?select='+LIST+'&'+armarFiltro()+'&order=tiene_fotos.desc,nombre.asc&limit='+CFG.pagina+'&offset='+S.off,{Prefer:'count=exact'})
  .then(function(r){if(!r.ok)throw 0;var cr=r.headers.get('content-range');if(cr&&cr.indexOf('/')>-1){var t=parseInt(cr.split('/')[1],10);if(!isNaN(t))S.total=t}return r.json()})
  .then(function(d){
    guardar(d);
    var g=$('#gridTienda');
    if(reset)g.innerHTML='';
    if(!d.length&&S.off===0){
      g.innerHTML='<div class="vacio" style="grid-column:1/-1">No encontramos productos con esa búsqueda.<br>Dinos qué necesitas y lo conseguimos.<br><a class="btn btn-verde" target="_blank" rel="noopener" href="'+esc(waUrl('Hola Nicom System, estoy buscando: '+(S.q||S.cat||'____')))+'">Preguntar por WhatsApp</a></div>';
    }else g.insertAdjacentHTML('beforeend',d.map(cardHtml).join(''));
    S.off+=d.length;
    var total=S.total!=null?S.total:S.off;
    $('#estado').textContent=total?('Mostrando '+Math.min(S.off,total)+' de '+total+' productos'+(S.cat?' en '+S.cat:'')+(S.q?' para "'+S.q+'"':'')):'';
    $('#btnMas').hidden=!(d.length===CFG.pagina&&(S.total==null||S.off<S.total));
  }).catch(falloTienda).then(function(){S.busy=false});
}
function pintarChips(){
  $('#chips').innerHTML=['Todos'].concat(CHIPS).map(function(c){
    var on=(c==='Todos'&&!S.cat)||c===S.cat;
    return '<button class="chip'+(on?' on':'')+'" data-chip="'+esc(c==='Todos'?'':c)+'">'+esc(c)+'</button>';
  }).join('');
}
function irTienda(){var t=$('#tienda');if(t)t.scrollIntoView({behavior:'smooth'})}
function filtrarCat(c,ir){
  if(!$('#gridTienda')){location.href='tienda.html?cat='+encodeURIComponent(c);return}
  S.cat=c;S.q='';$('#q').value='';pintarChips();$('#selCat').value=CHIPS.indexOf(c)>-1?'':c;cargarTienda(true);if(ir)irTienda()}
function buscar(t){
  if(!$('#gridTienda')){location.href='tienda.html?q='+encodeURIComponent(t.trim().slice(0,60));return}
  S.q=t.trim();S.cat='';$('#q').value=S.q;pintarChips();$('#selCat').value='';cargarTienda(true)}
if($('#gridTienda')){
  $('#chips').addEventListener('click',function(e){var b=e.target.closest('[data-chip]');if(b)filtrarCat(b.getAttribute('data-chip'))});
  $('#selCat').onchange=function(){if(this.value)filtrarCat(this.value)};
  $('#formBuscar').onsubmit=function(e){e.preventDefault();buscar($('#q').value)};
  $('#btnMas').onclick=function(){cargarTienda(false)};
}
if($('#formHero'))$('#formHero').onsubmit=function(e){e.preventDefault();buscar($('#qHero').value);irTienda()};
function cargarCategorias(){
  api('vista_catalogo_categorias?select=categoria&tenant_slug=eq.'+CFG.slug+'&order=categoria.asc').then(function(r){return r.json()}).then(function(d){
    var s=$('#selCat');d.forEach(function(x){if(x.categoria&&CHIPS.indexOf(x.categoria)<0){var o=document.createElement('option');o.value=x.categoria;o.textContent=x.categoria;s.appendChild(o)}});
    if(S.cat&&CHIPS.indexOf(S.cat)<0)s.value=S.cat;
  }).catch(function(){});
}

/* ===== Clics: categoría, búsqueda sugerida, abrir detalle, agregar ===== */
document.addEventListener('click',function(e){
  var a=e.target.closest('[data-add]');if(a){agregar(a.getAttribute('data-add'));return}
  var c=e.target.closest('[data-cat]');if(c){filtrarCat(c.getAttribute('data-cat'),true);return}
  var s=e.target.closest('[data-q]');if(s){buscar(s.getAttribute('data-q'));irTienda();return}
  var o=e.target.closest('[data-open]');if(o){abrirProducto(o.getAttribute('data-open'))}
});

/* Especificaciones ordenadas: abre los grupos anidados (ej. "caracteristicas"), no repite datos y oculta lo que ya se ve arriba (Ref/SKU). */
function especsLimpias(e){
  var filas=[];
  function mayus(t){t=String(t).replace(/_/g,' ').trim();return t.charAt(0).toUpperCase()+t.slice(1)}
  function texto(v){return Array.isArray(v)?v.filter(function(x){return x!=null&&x!==''}).join(', '):String(v).trim()}
  function objeto(v){
    if(v&&typeof v==='object'&&!Array.isArray(v))return v;
    if(typeof v==='string'&&/^\s*\{[\s\S]*\}\s*$/.test(v)){try{var o=JSON.parse(v);if(o&&typeof o==='object')return o}catch(_){}}
    return null;
  }
  function agregar(k,v,prof){
    if(v==null||v==='')return;
    var o=objeto(v);
    if(o&&prof<3){Object.keys(o).forEach(function(c){agregar(c,o[c],prof+1)});return}
    if(typeof v==='object'&&!Array.isArray(v))return;
    var t=texto(v);if(t)filas.push([mayus(k),t]);
  }
  if(Array.isArray(e))e.forEach(function(x){if(x&&typeof x==='object')agregar(x.nombre||x.clave||x.key||'',x.valor!=null?x.valor:x.value,0);else if(x!=null&&x!=='')filas.push(['',String(x)])});
  else if(e&&typeof e==='object')Object.keys(e).forEach(function(k){agregar(k,e[k],0)});
  var visto={},fin=[];
  filas.forEach(function(f){
    var c=f[0].toLowerCase();
    if(c==='sku'||c==='ref'||c==='referencia'||c==='código'||c==='codigo')return;
    var k=c+'|'+f[1].toLowerCase();if(visto[k])return;visto[k]=1;fin.push(f);
  });
  return fin.slice(0,20);
}

/* Descripción: solo el texto que generó la IA. En la publicación, primero va el texto de Mercado Libre (ATENCIÓN, garantía, ubicación, condiciones, horario, pagos, despacho, todo separado por líneas de asteriscos) y la descripción de la IA va después de la última línea de asteriscos. */
function descripcionIA(t){
  t=String(t==null?'':t).trim();if(!t)return '';
  var ml=/(PRECIO PUBLICADO|HORARIO DE TRABAJO|SOMOS OFICINA|OFRECEMOS GARANT|M[ÉE]TODOS DE (PAGO|DESPACHO)|\*{4,} ?ATENCI)/i;
  if(ml.test(t)){
    var re=/\*{5,}/g,m,fin=-1;
    while((m=re.exec(t)))fin=m.index+m[0].length;
    if(fin<0)return '';
    t=t.slice(fin).trim();
    /* si lo que queda sigue siendo texto de Mercado Libre (la IA aún no generó descripción), no se muestra nada */
    if(ml.test(t)||/^(RETIRO PERSONAL|DELIVERY|MERCADO ENV)/i.test(t)||t===t.toUpperCase())return '';
  }
  return t;
}

/* ===== Detalle de producto ===== */
function abrirProducto(id){
  var d=$('#dlgProd'),b=$('#prodBody');
  b.innerHTML='<button class="x" data-close aria-label="Cerrar">×</button><p>Cargando…</p>';
  if(!d.open)d.showModal();
  api('vista_catalogo_publico?select=*&tenant_slug=eq.'+CFG.slug+'&id=eq.'+encodeURIComponent(id)+'&limit=1').then(function(r){return r.json()}).then(function(rows){
    if(!rows.length){b.innerHTML='<button class="x" data-close aria-label="Cerrar">×</button><p>Este producto ya no está disponible.</p>';return}
    var q=rows[0];guardar([q]);
    var fotos=(Array.isArray(q.fotos_todas)?q.fotos_todas:[]).map(okUrl).filter(Boolean);
    if(!fotos.length&&okUrl(q.imagen_url))fotos=[okUrl(q.imagen_url)];
    var sp='';var pares=especsLimpias(q.especificaciones);
    if(pares.length)sp='<div class="spec">'+pares.map(function(x){return'<div><span>'+esc(x[0])+'</span><span>'+esc(x[1])+'</span></div>'}).join('')+'</div>';
    var sin=!(q.stock>0);
    b.innerHTML='<button class="x" data-close aria-label="Cerrar">×</button><h2>'+esc(limpio(q.nombre))+'</h2>'
     +'<div class="big" id="big">'+(fotos[0]?'<img src="'+esc(fotos[0])+'" alt="'+esc(limpio(q.nombre))+'">':PH)+'</div>'
     +(fotos.length>1?'<div class="gal">'+fotos.map(function(f){return'<img src="'+esc(f)+'" alt="" loading="lazy" data-foto="'+esc(f)+'">'}).join('')+'</div>':'')
     +'<div class="price" style="margin-top:14px">'+usd(q.precio_efectivo_usd)+'</div><div class="iva">+ IVA'+(q.precio_bs?' · '+bs(q.precio_bs):'')+(q.sku?' · Ref: '+esc(q.sku):'')+'</div>'
     +(function(d){return d?'<div class="desc">'+esc(d.slice(0,900))+'</div>':''})(descripcionIA(q.descripcion))+sp
     +(sin?'<a class="btn btn-verde" style="width:100%;margin-top:16px" target="_blank" rel="noopener" href="'+esc(waUrl('Hola Nicom System, quiero consultar disponibilidad de: '+q.nombre.slice(0,120)))+'">Consultar disponibilidad</a>'
          :'<button class="btn btn-azul" style="width:100%;margin-top:16px" data-add="'+esc(q.id)+'" data-cerrar>Agregar al pedido</button>');
    var url=location.pathname+'?producto='+encodeURIComponent(id);try{history.replaceState(null,'',url)}catch(_){}
  }).catch(function(){b.innerHTML='<button class="x" data-close aria-label="Cerrar">×</button><p>No pudimos cargar el detalle. Escríbenos por WhatsApp y te ayudamos.</p>'});
}
document.addEventListener('click',function(e){
  var f=e.target.closest('[data-foto]');if(f){$('#big').innerHTML='<img src="'+f.getAttribute('data-foto')+'" alt="">'}
  if(e.target.closest('[data-close]')){var d=e.target.closest('dialog');if(d)d.close()}
  if(e.target.closest('[data-cerrar]'))$('#dlgProd').close();
});
$('#dlgProd').addEventListener('close',function(){try{if(location.search)history.replaceState(null,'',location.pathname)}catch(_){}});
['#dlgProd','#dlgPago'].forEach(function(s){$(s).addEventListener('click',function(e){if(e.target===this)this.close()})});

/* ===== Carrito (LocalStorage) ===== */
var C=[];
try{C=JSON.parse(localStorage.getItem('nicom_carrito')||'[]');if(!Array.isArray(C))C=[]}catch(_){C=[]}
function guardarC(){try{localStorage.setItem('nicom_carrito',JSON.stringify(C))}catch(_){}pintarC()}
function agregar(id){
  var p=P[id];if(!p||!(p.stock>0))return;
  var it=C.filter(function(x){return x.id===id})[0];
  if(it){if(it.qty<p.stock)it.qty++;else{toast('Máximo disponible: '+p.stock);return}}
  else C.push({id:id,nombre:p.nombre,precio:Number(p.precio_efectivo_usd),bs:Number(p.precio_bs||0),img:okUrl(p.imagen_url),qty:1,stock:p.stock});
  guardarC();toast('Agregado al pedido');
}
function totales(){var u=0,b=0,n=0;C.forEach(function(x){u+=x.precio*x.qty;b+=x.bs*x.qty;n+=x.qty});return{u:u,b:b,n:n}}
function pintarC(){
  var t=totales(),n=$('#cartN');n.textContent=t.n||'';n.setAttribute('data-n',t.n);
  var box=$('#items');
  if(!C.length){box.innerHTML='<div class="vacio" style="margin-top:16px">Tu pedido está vacío.<br>Agrega productos desde la tienda.</div>';$('#footCarrito').style.display='none';return}
  $('#footCarrito').style.display='';
  box.innerHTML=C.map(function(x,i){
    return '<div class="it"><div class="im">'+(x.img?'<img src="'+esc(x.img)+'" alt="">':PH)+'</div><div><div class="n">'+esc(limpio(x.nombre))+'</div><div class="q"><button data-q2="-1" data-i="'+i+'" aria-label="Menos">−</button><span>'+x.qty+'</span><button data-q2="1" data-i="'+i+'" aria-label="Más">+</button><button class="del" data-del="'+i+'">Quitar</button></div></div><strong>'+usd(x.precio*x.qty)+'</strong></div>';
  }).join('');
  $('#totUsd').textContent=usd(t.u);
  $('#totBs').textContent=t.b?'≈ '+bs(t.b)+' (referencial, a la tasa del día)':'';
}
$('#items').addEventListener('click',function(e){
  var q=e.target.closest('[data-q2]'),d=e.target.closest('[data-del]');
  if(q){var it=C[+q.getAttribute('data-i')],v=+q.getAttribute('data-q2');if(!it)return;
    if(v>0&&it.qty>=it.stock){toast('Máximo disponible: '+it.stock);return}
    it.qty+=v;if(it.qty<1)C.splice(+q.getAttribute('data-i'),1);guardarC()}
  if(d){C.splice(+d.getAttribute('data-del'),1);guardarC()}
});
function abrirC(o){$('#drawer').classList.toggle('open',o);$('#ov').classList.toggle('open',o);$('#drawer').setAttribute('aria-hidden',!o)}
$('#btnCarrito').onclick=function(){abrirC(true)};
$('#cerrarCarrito').onclick=$('#ov').onclick=function(){abrirC(false)};
$('#btnVaciar').onclick=function(){if(confirm('¿Vaciar tu pedido?')){C=[];guardarC()}};
document.addEventListener('keydown',function(e){if(e.key==='Escape')abrirC(false)});

/* ===== Pago y envío del pedido por WhatsApp (+ registro del lead) ===== */
$('#btnPagar').onclick=function(){
  var t=totales();if(!t.n)return;
  $('#resPago').textContent=t.n+' producto(s) · Total '+usd(t.u)+' (sin IVA)';
  $('#ePago').textContent='';abrirC(false);$('#dlgPago').showModal();
};
$('#btnEnviar').onclick=function(){
  var nom=$('#pNombre').value.trim(),tel=$('#pTel').value.trim(),zona=$('#pZona').value.trim();
  var ent=(document.querySelector('input[name=entrega]:checked')||{}).value||'delivery';
  if(nom.length<2){$('#ePago').textContent='Escribe tu nombre para identificar tu pedido.';$('#pNombre').focus();return}
  if(tel.replace(/\D/g,'').length<7){$('#ePago').textContent='Escribe tu WhatsApp para confirmarte el pedido.';$('#pTel').focus();return}
  if(zona.length<2){$('#ePago').textContent=ent==='courier'?'Escribe tu ciudad y estado.':'Escribe tu zona o urbanización.';$('#pZona').focus();return}
  $('#ePago').textContent='';
  var m=(document.querySelector('input[name=metodo]:checked')||{}).value||'';
  var t=totales();
  var msg='Hola Nicom System, quiero este pedido (confirmen disponibilidad y entrega):\n'+C.map(function(x){return '• '+x.qty+' x '+x.nombre.slice(0,80)+' — '+usd(x.precio*x.qty)}).join('\n')
    +'\n\nTotal: '+usd(t.u)+' (sin IVA)'+(t.b?'\nReferencia en Bs.: '+bs(t.b):'')+'\nMétodo de pago: '+m+'\nNombre: '+nom+'\nWhatsApp: '+tel+'\nEntrega: '+(ent==='courier'?'Envío nacional por courier':'Delivery en Caracas')+' — '+zona;
  try{fetch(CFG.url+'/functions/v1/registrar-lead-catalogo',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:CFG.key,Authorization:'Bearer '+CFG.key},
    body:JSON.stringify({tenant_slug:CFG.slug,items:C.map(function(x){return{producto_id:x.id,nombre:x.nombre,cantidad:x.qty,precio_efectivo_usd:x.precio}}),total_usd:t.u,mensaje:msg,origen:'web',cliente_nombre:nom,cliente_telefono:tel,metodo_pago:m,entrega_tipo:ent,entrega_zona:zona,vendedor_codigo:vendedor()})}).catch(function(){})}catch(_){}
  window.open(waUrl(msg),'_blank','noopener');
  $('#dlgPago').close();
};

/* ===== Enlace de vendedor (?v=codigo): se recuerda para asignarle el pedido ===== */
(function(){var v=new URLSearchParams(location.search).get('v');if(v&&/^[A-Za-z0-9_-]{1,20}$/.test(v)){try{localStorage.setItem('nicom_v',v)}catch(_){}}})();
function vendedor(){try{return localStorage.getItem('nicom_v')||null}catch(_){return null}}
$('#entregas').addEventListener('change',function(){var c=(document.querySelector('input[name=entrega]:checked')||{}).value==='courier';$('#lblZona').textContent=c?'Ciudad y estado':'Zona o urbanización en Caracas';$('#pZona').placeholder=c?'Ej: Valencia, Carabobo':'Ej: San Bernardino'});

/* ===== Formulario de contacto (validación + WhatsApp) ===== */
if($('#formContacto'))$('#formContacto').onsubmit=function(e){
  e.preventDefault();
  var n=$('#cNombre').value.trim(),t=$('#cTel').value.trim(),m=$('#cMsg').value.trim(),ok=true;
  $('#eNombre').textContent=n.length<2?(ok=false,'Escribe tu nombre.'):'';
  $('#eTel').textContent=t.replace(/\D/g,'').length<7?(ok=false,'Escribe un teléfono válido.'):'';
  $('#eMsg').textContent=m.length<5?(ok=false,'Cuéntanos brevemente qué necesitas.'):'';
  if(!ok)return;
  window.open(waUrl('Hola Nicom System, soy '+n+' ('+t+'). Me interesa: '+$('#cInteres').value+'.\n'+m),'_blank','noopener');
};

/* ===== Arranque ===== */
pintarC();
if($('#vit')){cargarVitrina();cargarBajaron()}else cargarTasa();
cargarConteos();cargarDestacados();
if($('#gridTienda')){
  var qs0=new URLSearchParams(location.search),c0=qs0.get('cat'),q0=qs0.get('q');
  if(c0)S.cat=c0.slice(0,60);else if(q0){S.q=q0.slice(0,60).trim();$('#q').value=S.q}
  pintarChips();cargarCategorias();cargarTienda(true);
}
(function(){var id=new URLSearchParams(location.search).get('producto');if(id&&/^[0-9a-f-]{36}$/i.test(id))abrirProducto(id)})();
