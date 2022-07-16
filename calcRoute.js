let map;
let waypoints = []
let service
let optionalStops = []
var startPoint, endPoint
let temp;
var optionalLatLng = [];
var requestedTypes = { 'types': [], 'values': [] };
var totalDuration;
var Rectangle;
var Circle;
var optionalMarkers = []
var bestRoute = "";
var distanceMatrix = [];
var distanceToEnd = "";
var distanceFromStart = "";
var bounds;
var departureTime;
var tempRequestedTypes
var db = {}
const apiKey = 'AIzaSyDthlmSDFzdKH8eYH4Ni6JC3Zw1fVKkREs'
const {Client} = require("@googlemaps/google-maps-services-js");
const { PolyUtil} = require("node-geometry-library");

const client = new Client({})

function resetAll() {
	waypoints = []
	optionalStops = []
	dmservice = null
	optionalLatLng = []
	totalDuration = 0;
	// directionsService = new window.google.maps.DirectionsService();
	// directionsRenderer = new window.google.maps.DirectionsRenderer();
	// map = new google.maps.Map(document.getElementById("map"), {
	// 	zoom: 8,
	// 	center: { lat: 32.109333, lng: 34.855499 },
	// });
	Rectangle = null
	Circle = null;
	optionalMarkers = []
	bestRoute = ''
	distanceMatrix = []
	distanceToEnd = ''
	distanceFromStart = ''
	// document.getElementById("results").innerHTML = ""
}



function validateInitialRoute(result){
    let duration = result.routes[0].legs[0].duration.value/60
    if ( duration > 40){
        console.log('Route is too long! Choose another one.')
        return false;
    }
    if( duration < 10 ){
        getCircle();
		return 'circle'
    }
    else return 'rectangle';
}


module.exports = {
//2 initiates shortest path to start from
initialRoute: async function initialRoute(origin,destination,requestedTypes,dbStops,departure) {
	resetAll();
	let isValid;
	tempRequestedTypes={'types':requestedTypes.map(x=>x.type),'values':requestedTypes.map(x=>x.value)};
	startPoint = origin;
	endPoint = destination;
	// departureTime = departure
	let tempDB = Object.keys(dbStops)
	for (let i=0;i<tempDB.length;i++)
		db[tempDB[i]] = Object.values(dbStops[tempDB[i]])
	return await client.directions({
		params:{
			origin: startPoint,
			destination: endPoint,
			travelMode: "DRIVING",
			key: apiKey,
			// drivingOptions: {
			// 	departureTime: departureTime
			// }
		}
	}).then((result)=> {
		let res = result.data
		if(res.status=="OK"){
			isValid = validateInitialRoute(res)
			waypoints = PolyUtil.decode(res.routes[0].overview_polyline.points)
		}	
	})
	.then(async function () {
		let response = null;
		if (!isValid)
			throw 'Route is too long! Choose another one.'
		else if (isValid == 'circle')
			 response = await getCircle().then(res=>res);
		else response =  await get().then(res=>res).then(console.log(response))
		
			if(response=="not valid stop" || response=="there is no valid stops in this request"){
				throw "not valid stops"
			}		
			if(response == 'Best route was not found')
				throw response
			return response;
	})
} }


//3 Draw rectangle and get optional stops
function get() {
	 return new Promise(async function(resolve,reject){
		const PolygonCoords = PolygonPoints();
		getRectangle(PolygonCoords)

		for(let i=0;i<tempRequestedTypes.types.length;i++){
			let tempRequestedType = db[tempRequestedTypes.types[i]]
			for(let j=0;j<tempRequestedType.length;j++){
				let tempLocation = {'lat':tempRequestedType[j].latitude,'lng':tempRequestedType[j].longitude}
				if (PolyUtil.containsLocation(tempLocation,PolygonCoords,true)){
					optionalStops[optionalStops.length] = {'type':tempRequestedTypes.types[i],'location':tempLocation}
				}
			}
		}
		let x = await initialStops();
		resolve(x)
	})
}

//3.1
function PolygonPoints() {
	let polypoints = waypoints
	let PolyLength = polypoints.length;
	let UpperBound = [];
	let LowerBound = [];
	for (let j = 0; j <= PolyLength - 1; j++) {
		let NewPoints = PolygonArray(polypoints[j].lat);
		UpperBound.push({"lat":NewPoints[0],"lng":polypoints[j].lng});
		LowerBound.push({"lat":NewPoints[1],"lng":polypoints[j].lng});
	}
	let reversebound = LowerBound.reverse();
	let FullPoly = UpperBound.concat(reversebound);
	return FullPoly;
}

//3.1.1
function PolygonArray(latitude) {
	const R = 6378137;
	const pi = 3.14;
	//distance in meters
	const upper_offset = 1000;
	const lower_offset = -1000;
	Lat_up = upper_offset / R;
	Lat_down = lower_offset / R;
	//OffsetPosition, decimal degrees
	lat_upper = latitude + (Lat_up * 180) / pi;
	lat_lower = latitude + (Lat_down * 180) / pi;
	return [lat_upper, lat_lower];
}


//3.2 draw rectangle
function getRectangle(PolygonCoords) {
	var maxN, maxS, maxE, maxW, ne, sw;
	if(PolygonCoords.length > 0) {
		maxN = PolygonCoords[0].lat;
		maxS = PolygonCoords[0].lat;
		maxE = PolygonCoords[0].lng;
		maxW = PolygonCoords[0].lng;
	}

	for (let i = 0; i < PolygonCoords.length; i++){
		//check NE
		if(PolygonCoords[i].lat <= maxN && PolygonCoords[i].lng >= maxE) {
		maxN = PolygonCoords[i].lat;
		maxE = PolygonCoords[i].lng;
		ne = PolygonCoords[i];
	}
	//check SW
		if(PolygonCoords[i].lat >= maxS && PolygonCoords[i].lng <= maxW) {
		maxS = PolygonCoords[i].lat;
		maxW = PolygonCoords[i].lng;
		sw = PolygonCoords[i];
	}

	bounds = {ne,sw}
}
	//console.log('Furthest NE position is: '+ne.lng + ', '+ne.lat);
	//console.log('Furthest SW position is: '+sw.lng + ', '+sw.lat);	
}

//3.2 draw circle
function getCircle() {
	return new Promise(async function (resolve,reject){
		for (let i = 0; i < tempRequestedTypes.types.length; i++) {
			let tempRequestedPoints = db[tempRequestedTypes.types[i]]
			for(let j=0;j<tempRequestedPoints.length;j++){
				let tempLocation = {'lat':tempRequestedPoints[j].latitude,'lng':tempRequestedPoints[j].longitude}
				if(Math.abs(tempLocation.lat-endPoint.latitude)<0.025 && Math.abs(tempLocation.lng-endPoint.longitude)<0.025)
					optionalStops[optionalStops.length] = {'type':tempRequestedTypes.types[i],'location':tempLocation}		
				}
		// await client.placesNearby({
		// 	params:{
		// 		location: endPoint,
		// 		radius: '3000',
		// 		type: tempRequestedTypes.types[i],
		// 		key: 'AIzaSyAXYE1mVk8vzezCV5s3BfDPM-qJZDcIgw8'
		// 		}
		// })
		// .then(res=> {
		// 	optionalStops.push(...res.data.results)
		// })
			
	}
	console.log('circle mode')
	let x = await initialStops();
	resolve(x)
	})
}

async function initialStops() {
	//console.log(`optional stops length is ${optionalStops.length}`)
	if(optionalStops.length == 0){
		return "there is no valid stops in this request";
	}

	//optionalMarkers = []
	for (let i = 0; i < optionalStops.length; i++) {
		optionalStops = optionalStops.filter(function (point) {
			if (point.location === optionalStops[i].location || point.type != optionalStops[i].type) return true
			if (point.location.lat > optionalStops[i].location.lat + 0.005 ||
				point.location.lat < optionalStops[i].location.lat - 0.005)
				return true;
			if (point.location.lng > optionalStops[i].location.lng + 0.005 ||
				point.location.lng < optionalStops[i].location.lng - 0.005)
				return true;
			return false;
		})
	}

	return await findOptimalRoute().then(res=>res).catch(err=>err)
}

//4 calculate optimal route
async function findOptimalRoute() {

		if (optionalStops.length >= 8) {
			optionalStops = optionalStops
				.map((value) => ({ value, sort: Math.random() }))
				.sort((a, b) => a.sort - b.sort)
				.map(({ value }) => value)
		}
		arr = optionalStops.map((x, idx) => (
			{
				'location': x.location.lat + "," + x.location.lng,
				'id': idx,
				'type': x.type
			}))

		tempArr = []
		let tempRequests = {...tempRequestedTypes};

		//We need to fix it to up to 8 stops when we have enough stops! (tempArr.length < 8) in the while condition
		while (arr.length>0 && tempArr.length < 8) {
			for (let i = 0; i < tempRequests.types.length; i++) {
				if(arr.length>0 && tempArr.length < 8){
					tempStop = arr.find(x => x.type == tempRequests.types[i])
					if(tempStop==undefined && tempArr.length < tempRequests.types.length)
						throw "not valid stop"
						//We need to check how to send to the client that there is some stop is not valid in the map
						
						// if(confirm("There is no " + tempRequests.types[i] + " Stop. Do you want to advance without it?")){
						// 	tempRequests.types=tempRequests.types.filter(x=>x!==tempRequests.types[i]);
						// 	tempRequests.values=tempRequests.values.filter(x=>x!==tempRequests.values[i]);
						// }else{
						// 	alert("please try different request");
						// 	//window.location.reload();
						// 	return;
						// }
				
					else if(tempStop!=undefined){
					tempArr.push(tempStop);
					arr = arr.filter(x => x != tempStop)
					}
				}
			}
		}

		tempArr = tempArr.map(x => x.id)
		optionalStops = optionalStops.filter((x, idx) => tempArr.includes(idx));
		optionalLatLng = optionalStops.map(e => {return {latitude:e.location.lat,longitude:e.location.lng}})
		distanceFromStart = await client.distancematrix({
			params: { 
				destinations: optionalLatLng,
				mode: 'driving', 
				origins: [startPoint],
				key:apiKey,
				// drivingOptions: {
				// 	departureTime: departureTime
				// }
			}
		}).then(res=>res.data)
		distanceToEnd = await client.distancematrix({
			params: { 
				destinations:[endPoint],
				mode: 'driving',
				origins: optionalLatLng,
				key:apiKey,
				// drivingOptions: {
				// 	departureTime: departureTime
				// }
			}
		}).then(res=>res.data)

	temp = await client.distancematrix({
		params: { 
			destinations:optionalLatLng,
			mode: 'driving', 
			origins: optionalLatLng,
			key:apiKey,
			// drivingOptions: {
			// 	departureTime: departureTime
			// }
		}
	}).then(res=>res.data)
	// for (let i = 0; i < temp.rows.length; i++)
	// 	console.log(temp.rows[i].elements)

	for (let i = 0; i < temp.rows.length; i++) {
		distanceMatrix.push({
			'from': optionalStops[i],
			'routes': temp.rows[i].elements.map((point, idx) => {
				let type = optionalStops[idx].type;
				return { 'stop': optionalStops[idx], 'duration': point.duration, 'real_index': idx, 'type': type, 'stopValue': tempRequests.values[tempRequests.types.indexOf(type)] }
			})
		})
	}


	for (let i = 0; i < distanceFromStart.rows[0].elements.length; i++)
		algorithm(distanceMatrix[i].routes,distanceMatrix[i].routes, StartToPoint(i), [startPoint], i)

	if(bestRoute == ""){
		throw 'Best route was not found'
	}
		

	let finalStops = bestRoute.route.slice(1, bestRoute.route.length - 1);
	return await client.directions({
		params: {
			origin: bestRoute.route[0],
			destination: bestRoute.route[bestRoute.route.length - 1],
			waypoints: finalStops.map(x => x.stop.location),
			travelMode: 'driving',
			key: apiKey,
			// drivingOptions: {
			// 	departureTime: departureTime
			// }
		}
	}).then(res=> {
		if (res.data.status=="OK")
			return {route:res.data,waypoints:finalStops,encoded:res.data.routes[0].overview_polyline.points,duration:bestRoute.sum};
	})
}

//4.1 calculation algorithm
function algorithm(possibleStops,unMandatoryStops,sum, currentRoute, startIndex) {
	for (let i = 0; i < possibleStops.length; i++) {
		if (sum + distanceBetweenPoint(startIndex, possibleStops[i].real_index) < 40 * 60) {
			let otherStops;
			unMandatoryStops = unMandatoryStops.filter(route => route.stop.location !== possibleStops[i].stop.location)
			if(currentRoute.length>=tempRequestedTypes.types.length)
				otherStops=unMandatoryStops;
			else
				otherStops = possibleStops.filter(route => route.type !== possibleStops[i].type);
			algorithm(otherStops,unMandatoryStops,sum + distanceBetweenPoint(startIndex, possibleStops[i].real_index), currentRoute.concat(possibleStops[i]), possibleStops[i].real_index);
		}
	}
	if (sum + PointToEnd(startIndex) <= 40 * 60 && (bestRoute == "" && currentRoute.length>tempRequestedTypes.types.length || sum + PointToEnd(startIndex) > bestRoute.sum && possibleStops.length == 0))
		bestRoute = { 'route': currentRoute.concat(endPoint), 'sum': sum + PointToEnd(startIndex) };

}

function StartToPoint(stopIndex) {
	return distanceFromStart.rows[0].elements[stopIndex].duration.value;
}

function PointToEnd(stopIndex) {
	return distanceToEnd.rows[stopIndex].elements[0].duration.value;
}

function distanceBetweenPoint(startIndex, endIndex) {
	return distanceMatrix[startIndex].routes[endIndex].duration.value + distanceMatrix[startIndex].routes[endIndex].stopValue * 60;
}


//feature
// function showInstructions(result) {
// 	str=''
// 	let arr =result.routes[0].legs
// 	for(let i=0; i<arr.length; i++)
// 		for(let j=0;j<arr[i].steps.length;j++)
// 			str +=(arr[i].steps[j].instructions) + "</br>"
// 	document.getElementById('instructions').innerHTML=str
// }

// function getOptStopType(idx) {
// 	return optionalStops[idx].types.filter(x => requestedTypes.includes(x))
// }


// function algorithm(possibleStops, sum, currentRoute, startIndex) {
// 	for (let i = 0; i < possibleStops.length; i++) {
// 		if (sum + distanceBetweenPoint(startIndex, possibleStops[i].real_index) < 40 * 60) {
// 			let otherStops = possibleStops.filter(route => route.type !== possibleStops[i].type);
// 			algorithm(otherStops, sum + distanceBetweenPoint(startIndex, possibleStops[i].real_index), currentRoute.concat(possibleStops[i]), possibleStops[i].real_index);
// 		}
// 	}
// 	if (sum + PointToEnd(startIndex) <= 40 * 60 && (bestRoute == "" || sum + PointToEnd(startIndex) > bestRoute.sum && possibleStops.length == 0))
// 		bestRoute = { 'route': currentRoute.concat(near_end), 'sum': sum + PointToEnd(startIndex) };

// }


// function toggleRectangle() {
// 	if (Rectangle) {
// 		if (Rectangle.map == map)
// 			Rectangle.setMap(null)
// 		else Rectangle.setMap(map)
// 	}
// 	if (Circle) {
// 		if (Circle.map == map)
// 			Circle.setMap(null)
// 		else Circle.setMap(map)
// 	}
// }

// function toggleStops() {
// 	if (optionalMarkers.length == 0)
// 		initialStops();
// 	else {
// 		for (let i = 0; i < optionalMarkers.length; i++) {
// 			if (optionalMarkers[i].getMap() == null)
// 				optionalMarkers[i].setMap(map)
// 			else optionalMarkers[i].setMap(null);
// 		}
// 	};
// }

// const setRequestType = (element) => {
// 	if (element.checked) {
// 		requestedTypes.types = requestedTypes.types.concat(element.id);
// 		requestedTypes.values = requestedTypes.values.concat(element.value);
// 	}
// 	else {
// 		requestedTypes.types = requestedTypes.types.filter(type => type !== element.id)
// 		requestedTypes.values = requestedTypes.values.filter(value => value !== element.value)
// 	}
// }




