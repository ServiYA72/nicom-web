/* Nicom System · lógica compartida de la tienda: catálogo, carrito, pedido por WhatsApp. Cada página usa solo lo que tiene. */
/* ===== CONFIGURACIÓN (único lugar para cambiar datos) ===== */
var CFG={
  url:'https://tkhzuopapvclmcgxyood.supabase.co',
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraHp1b3BhcHZjbG1jZ3h5b29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDAzNTIsImV4cCI6MjEwMzc3NjM1Mn0.26o1jnPJzcokhweNiMpOB5A3rsUE3ZjxVV9YucD9ByU',
  slug:'nicom',
  tid:'d0b12d88-fb26-4b50-b477-aabdac9cc1f5',
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
/* Características: la base ya entrega solo las públicas ({marca, caracteristicas}) y la descripción solo de la IA.
   Aquí únicamente se ordenan para que se lean como ficha técnica. */
var ORDEN_ESPEC=['marca','modelo','procesador','memoria ram','almacenamiento','capacidad de almacenamiento','capacidad','tipo','factor de forma','interfaz','buffer','pantalla','tamaño de pantalla','resolución','tasa de refresco','sistema operativo','voltaje','protección','tomas de corriente','color','teclado','accesorios incluidos'];
function paresEspec(e){
  var c=e&&typeof e==='object'?e.caracteristicas:null;if(!c||typeof c!=='object')return[];
  var p=Object.keys(c).map(function(k){return[k,String(c[k]==null?'':c[k]).trim()]}).filter(function(x){return x[0]&&x[1]});
  p.sort(function(a,b){var i=ORDEN_ESPEC.indexOf(a[0].toLowerCase()),j=ORDEN_ESPEC.indexOf(b[0].toLowerCase());i=i<0?99:i;j=j<0?99:j;return i-j||a[0].localeCompare(b[0],'es')});
  return p.slice(0,14)}
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
   +'<div class="price">'+usd(p.precio_efectivo_usd)+anterior+'</div><div class="iva">+ IVA</div>'+btn+'</div></article>';
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
  $('#vitIva').textContent='+ IVA';
  $('#vitAdd').setAttribute('data-add',p.id);
}
function cargarVitrina(){
  api('vista_catalogo_publico?select='+LIST+'&tenant_slug=eq.'+CFG.slug+'&tiene_fotos=eq.true&stock=gt.0&order=bajo_de_precio.desc,precio_efectivo_usd.desc&limit=6')
  .then(function(r){if(!r.ok)throw 0;return r.json()})
  .then(function(d){
    d=d.filter(function(p){return okUrl(p.imagen_url)});
    if(!d.length)return;
    guardar(d);V.d=d;V.i=0;pintarV();
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
  }).catch(function(){});
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
    var pares=paresEspec(q.especificaciones),sp='';
    if(pares.length)sp='<h3 class="spec-t">Características</h3><div class="spec">'+pares.map(function(x){return'<div><span>'+esc(x[0])+'</span><span>'+esc(x[1])+'</span></div>'}).join('')+'</div>';
    var sin=!(q.stock>0);
    b.innerHTML='<button class="x" data-close aria-label="Cerrar">×</button><h2>'+esc(limpio(q.nombre))+'</h2>'
     +'<div class="big" id="big">'+(fotos[0]?'<img src="'+esc(fotos[0])+'" alt="'+esc(limpio(q.nombre))+'">':PH)+'</div>'
     +(fotos.length>1?'<div class="gal">'+fotos.map(function(f){return'<img src="'+esc(f)+'" alt="" loading="lazy" data-foto="'+esc(f)+'">'}).join('')+'</div>':'')
     +'<div class="price" style="margin-top:14px">'+usd(q.precio_efectivo_usd)+'</div><div class="iva">+ IVA'+(q.sku?' · Ref: '+esc(q.sku):'')+'</div>'
     +(q.descripcion?'<div class="desc">'+esc(String(q.descripcion).slice(0,900))+'</div>':'')+sp
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
  $('#totBs').textContent='Sin IVA. No pagas ahora: el monto en Bs. te lo damos al confirmar.';
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
  var er=function(m,el){$('#ePago').textContent=m;try{$('#ePago').scrollIntoView({block:'center',behavior:'smooth'})}catch(_){}if(el)el.focus({preventScroll:true});return false};
  if(nom.length<2)return er('Escribe tu nombre para identificar tu pedido.',$('#pNombre'));
  if(tel.replace(/\D/g,'').length<7)return er('Escribe tu WhatsApp para confirmarte el pedido.',$('#pTel'));
  var d={},linea='';
  if(ent==='courier'){
    var cr=document.querySelector('input[name=courier]:checked'),mod=(document.querySelector('input[name=cmod]:checked')||{}).value||'';
    var cFb=$('#cFallback');
    if(!cr&&!(cFb&&cFb.value.trim()))return er('Elige el courier con el que quieres recibir tu pedido.');
    if(!mod)return er('Elige si retiras en la agencia o lo recibes a domicilio.');
    var ofi=$('#cOficina').value.trim(),est=$('#dEstado').value,mun=$('#dMun').value,par=$('#dPar').value;
    var rn=$('#rNombre').value.trim(),rc=$('#rCedula').value.replace(/[^0-9A-Za-z]/g,''),dir=$('#dDir').value.trim(),ref=$('#dRef').value.trim(),map=$('#dMapa').value.trim();
    if(mod==='oficina'&&ofi.length<3)return er('Escribe en qué ciudad o agencia quieres retirar.',$('#cOficina'));
    if(!est)return er('Elige el estado de destino.',$('#dEstado'));
    if(!mun)return er('Elige el municipio.',$('#dMun'));
    if(!par)return er('Elige la parroquia.',$('#dPar'));
    if(mod==='domicilio'&&dir.length<6)return er('Escribe la dirección completa para la entrega a domicilio.',$('#dDir'));
    if(rn.length<3)return er('Escribe el nombre completo de quien recibe.',$('#rNombre'));
    if(rc.replace(/\D/g,'').length<5)return er('Escribe la cédula de quien recibe.',$('#rCedula'));
    if(map&&!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(map))return er('El enlace de Google Maps no parece válido. Déjalo vacío o pega el enlace que da Google Maps al compartir.',$('#dMapa'));
    var cn=cr?cr.getAttribute('data-n'):cFb.value.trim();
    d={courier_id:cr?cr.value:null,courier_modalidad:mod,courier_oficina:mod==='oficina'?ofi:null,dest_estado:est,dest_municipio:mun,dest_parroquia:par,dest_direccion:dir||null,dest_referencia:ref||null,dest_mapa_url:map||null,receptor_nombre:rn,receptor_cedula:rc};
    zona=par+', '+mun+', '+est;
    linea='Entrega: Envío nacional por '+cn+' ('+(mod==='oficina'?'retiro en agencia: '+ofi:'a domicilio')+')'
      +'\nDestino: '+zona+(dir?'\nDirección: '+dir:'')+(ref?'\nReferencia: '+ref:'')+(map?'\nUbicación: '+map:'')
      +'\nRecibe: '+rn+' · C.I. '+rc;
  }else{
    var cmu=$('#cMunicipio').value,cpa=$('#cParroquia').value;
    if(!cmu)return er('Elige el municipio donde recibes el pedido.',$('#cMunicipio'));
    if(!cpa)return er('Elige la parroquia.',$('#cParroquia'));
    if(zona.length<2)return er('Escribe tu urbanización o sector.',$('#pZona'));
    zona=zona+', '+cpa+', '+cmu;
    var pf=(document.querySelector('input[name=pref]:checked')||{}).value||'Nicom',tercero=pf!=='Nicom';
    var dd=$('#vDir').value.trim(),vm=$('#vMapa').value.trim();
    if(tercero&&!$('#pAcepta').checked)return er('Para elegir '+PREFN[pf]+' debes aceptar el aviso de responsabilidad, o elige "Delivery de Nicom".',$('#pAcepta'));
    if(vm&&!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(vm))return er('El enlace de Google Maps no parece válido. Déjalo vacío o pega el enlace que da Google Maps al compartir.',$('#vMapa'));
    d={entrega_preferencia:pf,acepta_terceros:tercero?true:null,dest_direccion:dd||null,dest_mapa_url:vm||null};
    linea='Entrega: Delivery en Caracas — '+zona+(dd?'\nDirección y referencia: '+dd:'')+(vm?'\nUbicación: '+vm:'')
      +'\nDelivery: '+(tercero?PREFN[pf]+' (elegido por el cliente; acepta que la responsabilidad del traslado es del servicio)':'de Nicom');
  }
  $('#ePago').textContent='';
  var m=(document.querySelector('input[name=metodo]:checked')||{}).value||'';
  var t=totales();
  var msg='Hola Nicom System, quiero solicitar este pedido:\n'+C.map(function(x){return '• '+x.qty+' x '+x.nombre.slice(0,80)+' — '+usd(x.precio*x.qty)}).join('\n')
    +'\n\nTotal: '+usd(t.u)+' (sin IVA)'+'\nMétodo de pago: '+m+'\nNombre: '+nom+'\nWhatsApp: '+tel+'\n'+linea;
  var cuerpo={tenant_slug:CFG.slug,items:C.map(function(x){return{producto_id:x.id,nombre:x.nombre,cantidad:x.qty,precio_efectivo_usd:x.precio}}),total_usd:t.u,mensaje:msg,origen:'web',cliente_nombre:nom,cliente_telefono:tel,metodo_pago:m,entrega_tipo:ent,entrega_zona:zona,vendedor_codigo:vendedor()};
  for(var k in d)cuerpo[k]=d[k];
  try{fetch(CFG.url+'/functions/v1/registrar-lead-catalogo',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:CFG.key,Authorization:'Bearer '+CFG.key},body:JSON.stringify(cuerpo)}).catch(function(){})}catch(_){}
  window.open(waUrl(msg),'_blank','noopener');
  $('#dlgPago').close();
};

/* ===== Datos de entrega: delivery en Caracas (preferencia + aviso) y envío nacional (courier + destino) ===== */
var PREFN={Nicom:'Delivery de Nicom',Yango:'Yango',Yummy:'Yummy',Ridery:'Ridery',Privado:'Motorizado privado'};
var ENVST={cour:null,geo:null};
function optsSel(arr,ph){return '<option value="">'+ph+'</option>'+arr.map(function(x){return '<option>'+esc(x)+'</option>'}).join('')}
function mapaAyuda(id){
  return '<div class="mapa-acc"><button type="button" class="btn-mapa" data-gps="'+id+'">📍 Usar mi ubicación actual</button>'
    +'<a class="btn-mapa" href="https://www.google.com/maps" target="_blank" rel="noopener">🗺️ Abrir Google Maps</a></div>'
    +'<p class="sub" id="'+id+'Msg">En Google Maps toca Compartir → Copiar enlace y pégalo arriba.</p>'
}
function ubicacionActual(id){
  var msg=$('#'+id+'Msg'),campo=$('#'+id);
  if(!navigator.geolocation){msg.textContent='Tu navegador no permite obtener la ubicación. Abre Google Maps, copia el enlace y pégalo arriba.';return}
  msg.textContent='Buscando tu ubicación… acepta el permiso que te pide el navegador.';
  navigator.geolocation.getCurrentPosition(function(p){
    campo.value='https://www.google.com/maps?q='+p.coords.latitude.toFixed(6)+','+p.coords.longitude.toFixed(6);
    msg.textContent='Listo: agregamos tu ubicación actual. Si no es donde recibirás el pedido, bórrala y pega otro enlace.';
  },function(){
    msg.textContent='No pudimos obtener tu ubicación (falta el permiso). Abre Google Maps, copia el enlace y pégalo arriba.';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}
var GCAR={'Libertador':'Distrito Capital','Chacao':'Miranda','Baruta':'Miranda','El Hatillo':'Miranda','Sucre':'Miranda'};
function cargarGeo(cb){
  if(ENVST.geo){cb(ENVST.geo);return}
  if(ENVST.geoCb){ENVST.geoCb.push(cb);return}
  ENVST.geoCb=[cb];
  fetch('venezuela.json?v=1').then(function(r){return r.json()}).then(function(g){ENVST.geo=g;var l=ENVST.geoCb;ENVST.geoCb=null;l.forEach(function(f){f(g)})})
    .catch(function(){ENVST.geoCb=null;var m=$('#cMunicipio'),s=$('#dEstado');if(m)m.innerHTML='<option value="">No se pudo cargar la lista, recarga la página</option>';if(s)s.innerHTML='<option value="">No se pudo cargar la lista, recarga la página</option>'})
}
function montarEnvio(){
  var z=$('#pZona');if(!z||$('#envBloque'))return;
  var h=document.createElement('div');h.id='envBloque';
  h.addEventListener('click',function(e){var g=e.target.closest('[data-gps]');if(g)ubicacionActual(g.getAttribute('data-gps'))});
  h.innerHTML=
   '<div id="bDel">'
  +'<label for="cMunicipio" class="lb">Municipio</label><select id="cMunicipio"><option value="">Cargando…</option></select>'
  +'<label for="cParroquia" class="lb">Parroquia</label><select id="cParroquia" disabled><option value="">Primero elige el municipio</option></select>'
  +'<div id="zonaSlot"></div>'
  +'<label for="vDir" class="lb">Dirección y punto de referencia <span class="op">(opcional)</span></label><input id="vDir" maxlength="250" placeholder="Ej: Calle 3, edif. Sol, piso 2 · frente a la panadería">'
  +'<label for="vMapa" class="lb">Enlace de Google Maps <span class="op">(opcional)</span></label><input id="vMapa" inputmode="url" maxlength="300" placeholder="Pega aquí el enlace de tu ubicación">'
  +mapaAyuda('vMapa')
  +'<p class="lb">¿Con quién prefieres el delivery?</p><div class="metodos" id="prefs">'
  +'<label><input type="radio" name="pref" value="Nicom" checked><span>Delivery de Nicom <small class="rec">Recomendado</small><small class="sub">Nicom se encarga y responde por tu entrega.</small></span></label>'
  +['Yango','Yummy','Ridery','Privado'].map(function(k){return '<label><input type="radio" name="pref" value="'+k+'"><span>'+PREFN[k]+'</span></label>'}).join('')
  +'</div>'
  +'<div class="aviso" id="avisoTer" hidden><strong>Aviso importante:</strong> si eliges Yango, Yummy, Ridery o un motorizado privado, el traslado lo hace ese servicio. Nicom prepara tu pedido y se lo entrega al conductor, pero <strong>no se hace responsable</strong> por retrasos, daños, pérdida ni trato durante el traslado. Si quieres que Nicom responda por tu entrega, elige <em>Delivery de Nicom</em>.'
  +'<label class="ck"><input type="checkbox" id="pAcepta"><span>Entiendo y acepto este aviso.</span></label></div>'
  +'<p class="sub">El costo del delivery te lo confirmamos por WhatsApp según tu zona y la hora.</p>'
  +'</div>'
  +'<div id="bCour" hidden>'
  +'<p class="lb">Elige tu courier</p><div class="metodos" id="listaCour"><p class="sub">Cargando couriers…</p></div>'
  +'<p class="lb">¿Cómo lo recibes?</p><div class="metodos"><label><input type="radio" name="cmod" value="oficina"><span>Retiro en agencia del courier</span></label><label><input type="radio" name="cmod" value="domicilio"><span>Entrega a domicilio</span></label></div>'
  +'<div id="bOfi" hidden><label for="cOficina" class="lb">Ciudad o agencia donde retiras</label><input id="cOficina" maxlength="150" placeholder="Ej: Agencia Valencia Centro"></div>'
  +'<label for="dEstado" class="lb">Estado</label><select id="dEstado"><option value="">Cargando…</option></select>'
  +'<label for="dMun" class="lb">Municipio</label><select id="dMun" disabled><option value="">Primero elige el estado</option></select>'
  +'<label for="dPar" class="lb">Parroquia</label><select id="dPar" disabled><option value="">Primero elige el municipio</option></select>'
  +'<label for="dDir" class="lb">Dirección <span class="op" id="opDir">(solo si es a domicilio)</span></label><textarea id="dDir" maxlength="280" rows="2" placeholder="Calle, edificio o casa, número"></textarea>'
  +'<label for="dRef" class="lb">Punto de referencia <span class="op">(opcional)</span></label><input id="dRef" maxlength="250" placeholder="Ej: al lado del banco">'
  +'<label for="dMapa" class="lb">Enlace de Google Maps <span class="op">(opcional)</span></label><input id="dMapa" inputmode="url" maxlength="300" placeholder="Pega aquí el enlace de tu ubicación">'
  +mapaAyuda('dMapa')
  +'<p class="lb">¿Quién recibe el pedido?</p>'
  +'<input id="rNombre" autocomplete="name" maxlength="100" placeholder="Nombre completo">'
  +'<input id="rCedula" inputmode="text" maxlength="14" placeholder="Cédula (Ej: V12345678)" style="margin-top:8px">'
  +'<p class="sub">El costo del envío te lo confirmamos por WhatsApp antes de despachar. La agencia puede pedir la cédula al entregar.</p>'
  +'</div>';
  z.parentNode.insertBefore(h,z.nextSibling);
  var lz=$('#lblZona');lz.textContent='Urbanización o sector';lz.className='lb';z.placeholder='Ej: Urb. La Florida, calle 3';
  $('#zonaSlot').appendChild(lz);$('#zonaSlot').appendChild(z);
  $('#cMunicipio').addEventListener('change',function(){var g=ENVST.geo,m=this.value,p=$('#cParroquia');if(!m||!g){p.innerHTML='<option value="">Primero elige el municipio</option>';p.disabled=true;return}p.innerHTML=optsSel(g[GCAR[m]][m],'Elige la parroquia');p.disabled=false});
  cargarGeo(function(g){$('#cMunicipio').innerHTML=optsSel(Object.keys(GCAR),'Elige el municipio')});
  $('#prefs').addEventListener('change',function(){var p=(document.querySelector('input[name=pref]:checked')||{}).value;$('#avisoTer').hidden=(p==='Nicom');if(p==='Nicom')$('#pAcepta').checked=false});
  document.querySelectorAll('input[name=cmod]').forEach(function(r){r.addEventListener('change',function(){var o=r.value==='oficina';$('#bOfi').hidden=!o;$('#opDir').textContent=o?'(opcional)':'(obligatoria a domicilio)'})});
  $('#dEstado').addEventListener('change',function(){var g=ENVST.geo,e=this.value,m=$('#dMun');$('#dPar').innerHTML='<option value="">Primero elige el municipio</option>';$('#dPar').disabled=true;if(!e||!g){m.innerHTML='<option value="">Primero elige el estado</option>';m.disabled=true;return}m.innerHTML=optsSel(Object.keys(g[e]).sort(function(a,b){return a.localeCompare(b,'es')}),'Elige el municipio');m.disabled=false});
  $('#dMun').addEventListener('change',function(){var g=ENVST.geo,e=$('#dEstado').value,m=this.value,p=$('#dPar');if(!m||!g){p.innerHTML='<option value="">Primero elige el municipio</option>';p.disabled=true;return}p.innerHTML=optsSel(g[e][m],'Elige la parroquia');p.disabled=false});
}
function cargarEnvioNacional(){
  if(!ENVST.cour){ENVST.cour='cargando';
    api('couriers?select=id,nombre,recomendado,orden,nota&tenant_id=eq.'+CFG.tid+'&order=orden').then(function(r){return r.json()}).then(function(a){
      if(!Array.isArray(a)||!a.length)throw 0;
      $('#listaCour').innerHTML=a.map(function(c){return '<label><input type="radio" name="courier" value="'+esc(c.id)+'" data-n="'+esc(c.nombre)+'"><span>'+esc(c.nombre)+(c.recomendado?' <small class="rec">Recomendado</small>':'')+(c.nota?'<small class="sub">'+esc(c.nota)+'</small>':'')+'</span></label>'}).join('');ENVST.cour='ok';
    }).catch(function(){ENVST.cour=null;$('#listaCour').innerHTML='<input id="cFallback" maxlength="60" placeholder="Escribe el courier que prefieres (Ej: Tealca, MRW, Zoom)">'});
  }
  cargarGeo(function(g){if($('#dEstado').options.length<=1)$('#dEstado').innerHTML=optsSel(Object.keys(g).sort(function(a,b){return a.localeCompare(b,'es')}),'Elige el estado')});
}
montarEnvio();
$('#entregas').addEventListener('change',function(){
  var c=(document.querySelector('input[name=entrega]:checked')||{}).value==='courier';
  $('#bCour').hidden=!c;$('#bDel').hidden=c;$('#pZona').hidden=c;$('#lblZona').hidden=c;
  if(c)cargarEnvioNacional();
});


/* ===== Enlace de vendedor (?v=codigo): se recuerda para asignarle el pedido ===== */
(function(){var v=new URLSearchParams(location.search).get('v');if(v&&/^[A-Za-z0-9_-]{1,20}$/.test(v)){try{localStorage.setItem('nicom_v',v)}catch(_){}}})();
function vendedor(){try{return localStorage.getItem('nicom_v')||null}catch(_){return null}}

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
if($('#vit')){cargarVitrina();cargarBajaron()}
cargarConteos();cargarDestacados();
if($('#gridTienda')){
  var qs0=new URLSearchParams(location.search),c0=qs0.get('cat'),q0=qs0.get('q');
  if(c0)S.cat=c0.slice(0,60);else if(q0){S.q=q0.slice(0,60).trim();$('#q').value=S.q}
  pintarChips();cargarCategorias();cargarTienda(true);
}
(function(){var id=new URLSearchParams(location.search).get('producto');if(id&&/^[0-9a-f-]{36}$/i.test(id))abrirProducto(id)})();
