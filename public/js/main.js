var defaultTorusColor = 0x00ffff;
var highlightedTorusColor = 0x00ff00;
var playerColor = [ 0xaf0000, 0x0000af ];
var socket;
var selectedPiece = null;
var torusPieces = [];
var arcDividerSize = 0.03;
var radDividerSize = 0.05;
var scene,camera,renderer,raycaster,mouse,controls;
var game;

function render() {
	requestAnimationFrame( render );
	renderer.render( scene, camera );
}

function createTorusPiece(arc,startRadArc,radArc,rotation) {
	rotation = rotation || 0;
	var geometry = new THREE.TorusGeometry( 6, 3, 32, 100, arc, startRadArc, radArc);
	var material = new THREE.MeshLambertMaterial({
			color: defaultTorusColor,
			flatShading: true,
		});
	var torus = new THREE.Mesh( geometry, material );
	torus.rotation.z = rotation;
	return torus;
}

function onMouseMove( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );

	var intersects = raycaster.intersectObjects( scene.children );

	selectedPiece = null;
	for ( var i = 0; i < torusPieces.length; i++ ) {
		// We only care about the first intersection
		if(intersects.length && torusPieces[i].object === intersects[0].object && !torusPieces[i].playerNumber ) {
			torusPieces[i].object.material.color.set( highlightedTorusColor);
			selectedPiece = torusPieces[i];
		} else {
			if(torusPieces[i].playerNumber) {
				torusPieces[i].object.material.color.set( playerColor[torusPieces[i].playerNumber - 1] );
			} else {
				torusPieces[i].object.material.color.set( defaultTorusColor );
			}
		}
	}
}

function onMouseClick( event ) {
	if(selectedPiece) {
		socket.emit('choosePiece',{piece: selectedPiece.id})
	}
}

function initGraphics() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.z = 50;
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xffffff );
	document.body.appendChild(renderer.domElement);

	// Set up raycaster
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();

	// Mouse Control
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enablePan = false;
	controls.enableZoom = false;

	// Let there be light
	var light = new THREE.PointLight( 0xffffff, 1, 4000 );
	light.position.set(50, 0, 0);
	var lightTwo = new THREE.PointLight(0xffffff, 1, 4000);
	lightTwo.position.set(-100, 800, 800);
	var ambientLight = new THREE.AmbientLight(0x404040);
	scene.add(light, lightTwo, ambientLight);

	// Create the Center Torus
	var geometry = new THREE.TorusGeometry( 6, 2.9, 32, 100 );
	var material = new THREE.MeshLambertMaterial({
			color: 0x000000
		});
	var centerTorus = new THREE.Mesh( geometry, material );
	scene.add(centerTorus);

	// Create the pieces
	for (var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			var piece = createTorusPiece(Math.PI * 2/3 - arcDividerSize, Math.PI * j * 2/3 + radDividerSize, Math.PI * 2/3 - radDividerSize, Math.PI * i * 2/3);
			scene.add(piece);
			torusPieces.push({id: i*3+j+1, object: piece});
		}
	}
}

function updateTorus(pieces) {
	for(var i = 0; i < torusPieces.length; i++) {
		var color = defaultTorusColor;
		if(pieces[torusPieces[i].id]) {
			torusPieces[i].playerNumber = pieces[torusPieces[i].id];
			color = playerColor[torusPieces[i].playerNumber - 1];
		}
		torusPieces[i].object.material.color.set( color );
	}
}

function setStatus(status) {
	document.getElementsByClassName('gameStatus')[0].innerHTML = status;
}

document.addEventListener('DOMContentLoaded', function() {
	initGraphics();
	render();

	// Set up socket
	socket = io.connect();

	socket.on('status', function(data) {
      if(data.status == 'wait') {
      	setStatus('Waiting...');
      }

      if(data.status == 'notturn') {
      	setStatus('It\'s not your turn!');
      }

      if(data.status == 'invalidmove') {
      	setStatus('Invalid move!');
      }
    });

    socket.on('start', function(data) {
      game = data;
      status = 'Game Start!';
      if(game.playerNumber == game.playerTurn) {
      	status += ' Your move.';
      } else {
      	status += ' Waiting on player.';
      }
      setStatus(status);
    });

    socket.on('end', function(data) {
    	if(game.playerNumber == data.winner) {
    		setStatus('You won!');
    	} else {
    		setStatus('You lost!');
    	}
    	console.log('Reason: ' + data.reason);
    });

    socket.on('move', function(data) {
    	game.playerTurn = data.playerTurn;
    	updateTorus(data.pieceStates);
    	if(game.playerNumber == game.playerTurn) {
			setStatus('Your move.');
		} else {
			setStatus('Waiting on player.');
		}
    });

	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'click', onMouseClick, false );
}, false);
