(function(){

	/* Initialisation */

	var current_position, 
	current_angle, 
	current_color, 
	current_thickness, 
	current_line_end, 
	variable,
	origin_offset,
	nb_line,
	angle_offset,
	loop_iteration,
	loop_boundaries,
	loop_offset,
	rangeCurrentValue,
	rangeMaxValue,
	speed;


	var draw_zone = SVG('draw_area');
	var editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");

	var init = function(canvasWidth, canvasHeight) {
		draw_zone.size(canvasWidth, canvasHeight);
		curent_position = [0,0];
		current_angle = 0;
		current_color = "#000000";
		current_thickness = 1;
		current_line_end = 'round';
		variable = new Array();
		origin_offset = [0,0];
		nb_line = 0;
		angle_offset = 0;
		loop_boundaries = new Array();
		loop_offset  = 0;
		rangeCurrentValue = $('#drawSpeed').val();
		rangeMaxValue = $('#drawSpeed').attr("max");
		speed = rangeMaxValue - rangeCurrentValue + 1;
	};

	init(1050, 600);
	
    //definitions des propriétés de la zone de travail
    //var size = [1000,1000];
    //var limits = [0,0,0,0];

    
    //var delorean = draw_zone.rect(5, 5).fill('#f06');//image('public/images/car.png', 25, 25);

    /* Partie manipulation du DOM */

    var errorDiv = $('#error_message');

    var rangeBtn = document.getElementById("drawSpeed");
    rangeBtn.addEventListener("input", function(event) {
    	rangeCurrentValue = event.target.value;
    	speed = rangeMaxValue - rangeCurrentValue + 1;
    });

    var clearAllBtn = document.getElementById("clear_all");
    clearAllBtn.addEventListener("click", function(event) {
    	event.preventDefault();
    	editor.setValue("");
    	errorDiv.text(">_ ");
    	draw_zone.clear();
    });

    var launchBtn = document.getElementById("validate_code");
    launchBtn.addEventListener("click", function(event) {
    	event.preventDefault();

    	init(1050, 600);

    	draw_zone.clear();
    	errorDiv.text(">_ ");
    	var code = editor.getValue();
    	ajaxGrammarFunction(code);
    });

    var saveButtons = document.getElementById("saveButtonsGroup");
    saveButtons.addEventListener("click", function(event) {
    	var extensionId = event.target.id;
    	var extension = extensionId.slice(0, 3);
    	window.open('/download/'+extension);
    });


    /* Partie AJAX */

    // pas de mot-clé var ici car phénomène d'hoisting
    function ajaxGrammarFunction(code) {
    	var data = {'data' : code};
    	$.ajax({
    		type : "POST",
    		contentType : "application/json",
    		url : window.location+'grammar',
    		data : JSON.stringify(data),
    		dataType : 'json',
    		success : function(data) {
    			updateDisplay(data);

    			var drawing = draw_zone.svg();
    			ajaxSaveFunction(drawing);
    		},
    		error : function(e) {
    			alert("Erreur de commande !");
    			htmlError = e.responseText;
    			var d = $('<div>').html(htmlError);
    			var errorContentArray = d[0].children[2].innerHTML.split("^");

    			var lineError = errorContentArray[0].split(":")[1].replace( /[^\d\.]*/g, '');
    			var errorContent = errorContentArray[1].split('at')[0].replace(/&nbsp;|<br>/g, '');
    			var errorMessage = '('+lineError+') '+ errorContent;
    			errorDiv.append(errorMessage);

                // Rajoute une croix rouge devant la 1ère ligne erronée
                var editorDiv = document.getElementById("editor");
                editorDiv.children[1].firstChild.children[lineError-1].classList.add("ace_error");
            }
        });
    };

    // Enregistre le dessin réalisé
    function ajaxSaveFunction(drawing) {
    	var data = {'drawing' : drawing};
    	$.ajax({
    		type : "POST",
    		contentType : "application/json",
    		url : window.location+'save',
    		data : JSON.stringify(data),
    		dataType : 'text',
    		success : function(res) {
    			console.log(res);
    		},
    		error : function(e) {
    			console.log('Error');
    			console.log(e);
    		}
    	});
    };

    /* Partie SVG */

    var convert_polar = function(distance,angle){
    	var x_composante = Math.round(distance*Math.cos((Math.PI/180)*(angle + angle_offset))); 
    	var y_composante = Math.round(distance*Math.sin((Math.PI/180)*(angle + angle_offset)));

        //if(x_composante>size[0]){x_composante=size[0]};
        //if(y_composante>size[1]){x_composante=size[1]};
        return([parseInt(curent_position[0]) + parseInt(x_composante), parseInt(curent_position[1]) + parseInt(y_composante)]);
    };

    var draw = function(x1,y1){
    	properties = { color: current_color, width: current_thickness };
    	var delay = nb_line*speed;

        //console.log(nb_line);

        putline(draw_zone,
        	origin_offset[0] + curent_position[0],
        	origin_offset[1] + curent_position[1],
        	origin_offset[0] + x1, 
        	origin_offset[1] + y1,
        	properties,
        	delay
        	);
    };

    var teleport = function(x,y){
		console.log("tttt");
		console.log(x);
		console.log(y);
    	curent_position = [x,y];
		console.log(curent_position);

	};

    // Affichage du graphe
    var putline = function(context,x0, y0, x1, y1, properties, delay_){
    	context.line(x0,y0,x1,y1)
    	.stroke(properties)
    	.animate(speed, '-', delay_)
    	.during(function(t, morph){
    		this.animate({ ease: '-', delay: 0, duration :10 }).stroke({ linecap: current_line_end });
    		this.attr({x2:morph(x0, x1), y2:morph(y0, y1)});
    	});
    };

    var updateDisplay = function(command_array){
    	nb_line = 0;
    	current_angle = 0;
    	current_color = "#000000";

    	for(let command of command_array){

			if(command.cmd === 'TELEPORT'){
    			s = curent_position;
    			e = command.val;
    			if(e[0][0] === '$' ){e[0] = parseInt(variable[command.val[0]]);}
    			if(e[1][0] === '$' ){e[1] = parseInt(variable[command.val[1]]);}
				teleport(parseInt(e[0]),parseInt(e[1]));
				console.log(e);
    		}



    		if(command.cmd === 'SET_ORIGIN'){
    			s = command.val;
    			origin_offset = [Number(s[0]),Number(s[1])];
    		}

    		if(command.cmd === 'MOVE'){
    			s = curent_position;
    			e = command.val;
    			if(e[0][0] === '$' ){e[0] = parseInt(variable[command.val[0]]);}
    			if(e[1][0] === '$' ){e[1] = parseInt(variable[command.val[1]]);}
    			//console.log(e);
    			nb_line++;
    			draw(e[0],e[1]);
    			teleport(e[0],e[1]);
    		}

    		if(command.cmd === 'DIST'){
    			var R = 0;
                if(typeof(command.varname)!== 'undefined' ){
                	R = parseInt(variable[command.varname]);
                    //console.log(command.varname);
                }else{
                	R = parseInt(command.val)
                }

                e = convert_polar(R,current_angle);
                nb_line++;
                //console.log(e);
                draw(e[0],e[1]);
                teleport(e[0],e[1]);
            }

            if(command.cmd === 'COLOR'){
            	current_color = command.val;
            }

            if(command.cmd === 'THICKNESS') {
            	current_thickness = command.val;
            }

            if(command.cmd === 'TURN'){
            	var angle = command.val;
            	//console.log(angle);
            	if(angle[0]=== '$' ){angle = variable[command.val];}
            	current_angle = parseInt(angle) + current_angle;
            	console.log(current_angle);
            }

            if(command.cmd === 'VAR=CSTE'){
            	variable[command.varname] = Number(command.val);
            }

            if(command.cmd === 'VAR++') {
            	variable[command.varname] = variable[command.varname] + 1;
            }

            if(command.cmd === 'VAR--') {
            	variable[command.varname] = variable[command.varname] - 1;	
            }

            if(command.cmd === 'VAR=VAR+VAR') {
				variable[command.varname] = Number(variable[command.varname1]) + Number(variable[command.varname2]);
			}

			if(command.cmd === 'VAR=VAR+CSTE') {
				variable[command.varname] = Number(variable[command.varname1]) + Number(command.val);
			}

			if(command.cmd === 'VAR=CSTE+CSTE') {
				variable[command.varname] = Number(command.val) + Number(command.val1);
			}

			if(command.cmd === 'VAR=VAR-VAR') {
				variable[command.varname] = Number(variable[command.varname1]) - Number(variable[command.varname2]);
			}

			if(command.cmd === 'VAR=VAR-CSTE') {
				variable[command.varname] = Number(variable[command.varname1]) - Number(command.val);
			}

			if(command.cmd === 'VAR=CSTE-CSTE') {
				variable[command.varname] = Number(command.val) - Number(command.val1);
			}

			if(command.cmd === 'VAR=VAR*VAR') {
				variable[command.varname] = Number(variable[command.varname1]) * Number(variable[command.varname2]);
			}

			if(command.cmd === 'VAR=VAR*CSTE') {
				variable[command.varname] = Number(variable[command.varname1]) * Number(command.val);
			}

			if(command.cmd === 'VAR=CSTE*CSTE') {
				variable[command.varname] = Number(command.val) * Number(command.val1);
			}

			if(command.cmd === 'VAR=VAR/VAR') {
				variable[command.varname] = Number(variable[command.varname1]) / Number(variable[command.varname2]);
			}

			if(command.cmd === 'VAR=VAR/CSTE') {
				variable[command.varname] = Number(variable[command.varname1]) / Number(command.val);
			}

			if(command.cmd === 'VAR=CSTE/CSTE') {
				variable[command.varname] = Number(command.val) / Number(command.val1);
			}

            if(command.cmd === 'DBG_VAR'){
            	//console.log(variable[command.varname]);
            }

            if(command.cmd === 'REPEAT'){
            	loop_iteration = command.val;
            	loop_boundaries[0] = loop_offset + command.index;
            }

            if(command.cmd === 'E_REPEAT'){
				//console.log("mode boucle activé")
				nb_cmd = 0;
				loop_boundaries[1] = loop_offset + command.index;
				for(let i = 0; i<loop_iteration-1;i++){
					for(let j = loop_boundaries[0]+1; j<loop_boundaries[1];j++){
						nb_cmd++;
						command_array.splice(loop_boundaries[1]+nb_cmd,0,command_array[j]);
					}
				}
				loop_offset =loop_offset+nb_cmd;
				nb_cmd = 0;
				loop_boundaries = [0,0];
				loop_iteration = 0;
			}
		}
		//console.log(command_array);
	};
})();

