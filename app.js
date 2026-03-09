
let items = JSON.parse(localStorage.getItem('items')||'[]');
let senior = false;

function save(){ localStorage.setItem('items',JSON.stringify(items)); }

function addItem(){
  const val = itemInput.value.trim();
  if(!val) return;
  items.push({name:val, done:false});
  itemInput.value='';
  save(); render();
}

function toggle(id){
  items[id].done=!items[id].done;
  save(); render();
}

function render(){
  todo.innerHTML=''; done.innerHTML='';
  items.forEach((it,i)=>{
    const li=document.createElement('li');
    li.textContent=it.name;
    li.onclick=()=>toggle(i);
    (it.done?done:todo).appendChild(li);
  });
}
toggleSenior.onclick=()=>{
  senior=!senior;
  document.documentElement.classList.toggle('senior',senior);
}
render();
