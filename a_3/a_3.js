/**
 * a_3.js
 * @fileoverview Demonstrate transformations, animations, and having fun!
 * @author Sean Pimentel
 */

"use strict";

/**
 * @type {boolean}  for determining if the game is over
 * @type {int}      for keeping track of the score
 * @type {boolean}  for determining if a point is already been added
 */
var game_over = false;
var score = 1;
var should_add = true;
var g_last = Date.now();

/**
 * Rope Object
 * @type {{verticies: Float32Array,
 *      n: number, buffer: number, speed: number,
 *      currentAngle: number, modelMatrix: Matrix4}}
 */
var rope = {
    verticies: new Float32Array([
        0.05, 0.05
        ,-0.05, 0.05
        ,-0.05, -0.05
        ,0.05, -0.05
    ]),
    n: 4,
    buffer: 0,
    speed: 1,
    currentAngle: 0.0,
    modelMatrix: new Matrix4()
};

/**
 * Player Object
 * @type {{verticies: Float32Array, n: number, buffer: number,
 *      jumping: boolean, velocity: number, gravity: number,
 *      jump_height: number, modelMatrix: Matrix4}}
 */
var player = {
    verticies: new Float32Array([
        0.1, 0.1
        ,-0.1, 0.1
        ,-0.1, -0.1
        ,0.1, -0.1
    ])
    ,n: 4
    ,buffer: 0
    ,jumping: false
    ,velocity: 0
    ,gravity: -5.0
    ,jump_height: 0
    ,modelMatrix : new Matrix4()
};

/**
 * Vertex Shader
 * @type {string}
 */
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'void main() {\n' +
    '   gl_Position = u_ModelMatrix * a_Position;\n' +
    '}\n';

/**
 * Fragment Shader
 * @type {string}
 */
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_Color;\n' +
    '}\n';

// Rotation angle (degrees/second)
var ANGLE_STEP = 60.0;

/**
 * Initializes the buffers and starts the rendering loop
 * @returns {number}
 */
function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    window.onkeydown = function(e) {
        return !(e.keyCode == 32);
    };

    document.onkeyup = checkKey;
    function checkKey(e){
        e = e || window.event;
        if (e.keyCode == 32){
            jump();
        }
    }

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if(a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    var u_Color = gl.getUniformLocation(gl.program, 'u_Color');
    if (u_Color < 0) {
        console.log('Failed to get the storage location of u_Color');
        return -1;
    }

    // Create a buffer object
    rope.buffer = gl.createBuffer();
    if (!rope.buffer) {
        console.log('Failed to create the buffer object');
        return;
    }
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, rope.buffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, rope.verticies, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
        a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);


    player.buffer = gl.createBuffer();
    if (!player.buffer){
        console.log('Failed to create the buffer object');
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, player.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, player.verticies, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
        a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Specify the color for clearing <canvas>
    gl.clearColor(0, 0, 0, 1);

    // Get storage location of u_ModelMatrix
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    // Start drawing
    var tick = function() {
        if (!game_over){
            var g_now = Date.now();
            var delta = g_now - g_last;
            g_last = g_now;
            checkGameOver(rope, player);

            animateRope(rope, delta);

            if (player.jumping)
                animateJump(player, delta);

            draw(gl, rope, player, u_ModelMatrix, u_Color, a_Position);
            requestAnimationFrame(tick, canvas);
        }
    };
    tick();
}

/**
 * Responsible for rendering the rope and player using model matricies for
 *  applying transformations
 *
 * @param gl            rendering context
 * @param rope          rope object
 * @param player        player object
 * @param u_ModelMatrix model matrix location on gpu
 * @param u_Color       color location on gpu
 * @param a_Position    position matrix on gpu
 */
function draw(gl, rope, player, u_ModelMatrix, u_Color, a_Position) {
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);


    // Set the rotation matrix
    rope.modelMatrix.setRotate(rope.currentAngle, 0, 0, 1);
    rope.modelMatrix.translate(0.7, 0, 0);

    // Pass the rotation matrix to the vertex shader
    gl.uniformMatrix4fv(u_ModelMatrix, false, rope.modelMatrix.elements);
    gl.uniform4f(u_Color, 0, .3, .7, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, rope.buffer);
    gl.vertexAttribPointer(
        a_Position, 2, gl.FLOAT, false, 0, 0);

    // Draw the rope
    gl.drawArrays(gl.TRIANGLE_FAN, 0, rope.n);


    player.modelMatrix.setTranslate(0, -0.6 + player.jump_height, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, player.modelMatrix.elements);
    gl.uniform4f(u_Color, 0, .6, .4, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, player.buffer);
    gl.vertexAttribPointer(
        a_Position, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, player.n);
}

/**
 * Animates the rope and checks if point should be awarded
 * @param angle
 * @returns {*} new angle to rotate rope by
 */
function animateRope(rope, delta) {
    // Update the current rotation angle (adjusted by the elapsed time)
    var newAngle = rope.currentAngle + (ANGLE_STEP * delta) / 1000.0;
    newAngle %= 360;
    ANGLE_STEP += 0.15;

    if (newAngle < 269 && newAngle > 0)
        should_add = true;

    if (!game_over && should_add && newAngle > 270) {
        $('#score').html(score++);
        should_add = false;
    }
    rope.currentAngle = newAngle;
}

/**
 * Animates the players jump
 * @param player
 * @returns {number}
 */
function animateJump(player, delta) {
    var new_jump;
    if (player.jump_height >= 0){
        new_jump = player.jump_height + (player.velocity * delta / 1000.0);
        player.velocity += player.gravity * delta / 1000.0;
    } else {
        player.jumping = false;
        return 0;
    }

    player.jump_height = new_jump;
}

/**
 * Checks if the locations of the rope and player collide
 *  and game should be over
 * @param rope
 * @param player
 */
function checkGameOver(rope, player){
    if (rope.currentAngle > 255 && rope.currentAngle < 285 && player.jump_height < 0.05){
        game_over = true;
    }
}

/**
 * Sets the players jumping status and gives a velocity to the player
 */
function jump(){
    if (!player.jumping){
        player.jumping = true;
        player.velocity = 2;
        player.jump_height = 0;
    }
}
