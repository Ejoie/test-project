var myMap; // переменная карты
var collect; // переменная для сокращения именования
var fakePoint; /* костыль-переменная для сохранения начальной точки геолокации, так как для адресации по коллекции в я.картах индексы записываю в хтмл атрибуты и при удалении точка просто перезаписывается первоначальной, чтобы не повредить индексацию, но код collect.set(index,collect.get(0)); выдаёт ошибку, а если забрать точку при ее создании, то он ее принимает */

ymaps.ready(init);
function init(){
	// Создание карты.
	myMap = new ymaps.Map("map", {
            center: [55.76, 37.64],
            zoom: 15 // Допустимые значения: от 0 (весь мир) до 19.
        });

	//Поиск местонахождения по ip
        ymaps.geolocation.get({
        provider: 'yandex'
        }).then(function (result) {
        result.geoObjects.options.set('preset', 'islands#redCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Текущее местоположение'
        });

	collect = myMap.geoObjects;
        collect.add(result.geoObjects);
	fakePoint = result.geoObjects.get(0);

	// отправка полученных координат на страницу
	let geoloc = pointsNode.children[0].children; 
	geoloc[0].value = "Местоположение по ip";
	geoloc[1].value = result.geoObjects.position[0];
	geoloc[2].value = result.geoObjects.position[1];

	myMap.setCenter(result.geoObjects.get(0).geometry.getCoordinates(),13);
    });
};

// обьект должен будет потом создаваться после ответа сервера об успешной авторизации
// содержит основные функции для взаимодействия с сервером авт.пользователя
var userPoints = {
 login: 'Дорогой',
 index: 1, // индекс для хтмл атрибута

 // добавление новой точки
 addPoint: function (point, info){
  try{
   //servercall()
   let coords = checkCoords(point);
   if (coords !== null) {
    point = new ymaps.Placemark(coords, {balloonContent: info}, {preset: "islands#blackIcon"});
    myMap.geoObjects.add(point);
    myMap.setCenter(coords, 16);
    return this.index++;
   } else { alert("ошибка ввода"); return false; }
  } catch(e){
alert(e);
   return false;
  }
 },

 // запись изменённых данных в точку
 changePoint: function (point, info, index){
	try{
	let coords = checkCoords(point);
	if (coords !== null) {
 	 //serverCall();
	collect.get(index).geometry.setCoordinates(coords);
        collect.get(index).properties.set({balloonContent: info});
	myMap.setCenter(coords, 16); 
	return true;
	} else {alert("ошибка ввода"); return false; }
	}catch(e){
   	alert(e);
   	return false;
  	}
 },

 // удаляет точку, перезаписывая ее первоначальным положением
 //не понял как работает indexOf в картах, а при ручном поиске сравнение работает не так как ожидалось
 deletePoint: function (index){ 
 try{
   //serverCall();
   collect.set(index,fakePoint); 
   return true;
  } catch(e){
   alert(e);

   return false;
  }
 },

 // возвращение данных элемента при отмене редактирования
 getPoint: function (index){
  let oldPoint = collect.get(index);
  let balloon = oldPoint.properties.get('balloonContent');
  oldPoint = oldPoint.geometry.getCoordinates();
  myMap.setCenter(oldPoint, 16);
  return [balloon, oldPoint[0], oldPoint[1]];
 }
 
};

// обработка кнопок панели координат
var pointsNode = document.getElementById('points');
var pointClass = document.querySelector('.point');

//функция для изменения доступности полей редактирования
//f-true -если первое нажатие, false -второе или отмена
function changePointButton(elem,f){ 
 if(f){
  for (let i = 0; i < 3; i++) {elem[i].removeAttribute('readonly');};
  elem[3].value="Сохранить"; 
  elem[4].value="Отменить"; 
  } else {
  for (let i = 0; i < 3; i++) {elem[i].setAttribute('readonly','true');};
  elem[3].value="Редактировать"; 
  elem[4].value="Удалить";
  }
};

// проверка координат на корректный ввод
function checkCoords(point){
let coords =[];
for (let i=0; i< point.length; i++){
	coords[i] = parseFloat(point[i]);
	if(isNaN(coords[i]) || coords[i]<0) return null; }
return coords;
};

//обработка событий кнопок
pointsNode.addEventListener('click', {
     handleEvent(event) {
     let et = event.target
     let dataBlock = et.parentElement.children;
	//нажатия на кнопки     
	switch(et.dataset.action) {        
	//добавить точку

	case 'add':
	//получаем индекс массива и записываем данные в клонированный элемент
	let index=userPoints.addPoint([dataBlock[1].value, dataBlock[2].value], dataBlock[0].value)      
    	if (index !== false){
		let newPoint = pointClass.cloneNode(true);
		newPoint.dataset.index=index;
		newPoint.hidden=false;
		for (let i=0; i<3;i++) { newPoint.children[i].value = dataBlock[i].value; }
		pointClass.after(newPoint);
		};
          break;
	
	//удалить точку
        case 'deleting':
	  if (et.value==="Удалить"){
	  userPoints.deletePoint(et.parentElement.dataset.index);
          et.parentElement.remove();
          } else { //нажали отмену
	  changePointButton(dataBlock,false);
	  let oldPoint = userPoints.getPoint(et.parentElement.dataset.index);
	  for (let i=0; i<3;i++) { dataBlock[i].value = oldPoint[i]; }
	  }
	  break;

	//Редактировать данные точки
        case 'editing':
          if(et.value==="Редактировать") {//изменить поля для редактирования
		changePointButton(dataBlock,true);
		}
		else 
		{//соxранение изменений
		changePointButton(dataBlock,false);
		userPoints.changePoint([dataBlock[1].value,dataBlock[2].value],dataBlock[0].value,et.parentElement.dataset.index);		
		}
          break;

	// показ точки на карте при нажатии кнопки либо элемента
	default:
	  let check = et.closest('[data-action=find]');
	  if (check !== null){
	   let coords = [];
	   if (!check.dataset.index){//если нажали на кнопку
            coords = checkCoords( [dataBlock[1].value, dataBlock[2].value] );
	   } else {//если на элемент
	    coords = checkCoords( [check.children[1].value, check.children[2].value] ); }
	   if (coords !== null) {myMap.setCenter(coords, 16);}
	   else alert("ошибка ввода"); }
          break;
	}}
});


// типы на вид одинаковые, но сравнение выкидывает false
//console.log(collect.get(0).properties.get('balloonContent'));
//console.log(point === this.makePosition(collect.get(0).position));
//console.log(String(info) === String(collect.get(0).properties.get('balloonContent'))); 
