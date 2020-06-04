
var scene = new THREE.Scene()

camera = new THREE.PerspectiveCamera(75, window.innerWidth/ window.innerHeight, 0.1, 1000);
camera.position.z = .6;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight);
document.body.appendChild( renderer.domElement );

let color = {
    h: 0.3524173027989822,
    s: 0.8238993710691823,
    v: 0.6235294117647059
};
let smooth = .2;
let speed = 70.;
let cycle = false;
window.wallpaperPropertyListener = {
	applyUserProperties: function(properties) {
		if (properties.customcolor) {
			if (properties.customcolor.value) {
				var c = properties.customcolor.value.split(' ').map(function(c) {
					return Math.ceil(c * 255)
				});
			document.body.style.background = 'rgb(' + c + ')';
			scene.background = new THREE.Color('rgb(' + c + ')');			
			}
        };
        if (properties.color) {
			if (properties.color.value) {
				var c = properties.color.value.split(' ').map(function(c) {
					return Math.ceil(c * 255)
                });
                color = rgb2hsv(c)
			}
		};
		
		if (properties.smoothslider){
			smooth = properties.smoothslider.value * 0.01;
        };

        if (properties.color_speed){
			speed = properties.color_speed.value * 10;
        };
        
        if (properties.cyclecolor){
            cycle = properties.cyclecolor.value;
        }
	}
}

/*
str = "0.10980392156862745 0.6235294117647059 0.16862745098039217";
c = str.split(' ').map(function(c) {
    return Math.ceil(c * 255)});
color = rgb2hsv(c);
console.log(color);
*/

let uniforms = {}
addPlane()

var startTime = Date.now();
animationLoop()


function addPlane() {
    //uniforms.colorA = {type: 'vec3', value: new THREE.Color(0x74ebd5)}
    //uniforms.colorB = {type: 'vec3', value: new THREE.Color(0xACB6E5)}
    uniforms.color = {type: 'vec3', value: new THREE.Vector3(color.h, color.s, color.v)}
	uniforms.cycle = {type: 'bool', value: cycle}
	uniforms.speed = {type: 'float', value: speed}
	uniforms.smooth = {type: 'float', value: smooth}
    uniforms.time = {type: 'float', value: 1.0}
    
    let geometry = new THREE.PlaneGeometry( 2, 2, 1)
    let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        fragmentShader: fragmentShader(),
        vertexShader: vertexShader(),
    })

    let mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
}

function rgb2hsv (c) {
    let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
    rabs = c[0] / 255;
    gabs = c[1] / 255;
    babs = c[2] / 255;
    v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
    diffc = c => (v - c) / 6 / diff + 1 / 2;
    percentRoundFn = num => Math.round(num * 100) / 100;
    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(rabs);
        gg = diffc(gabs);
        bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return {
        h: h,
        s: s,
        v: v
    }
}

    
function vertexShader(){
    return `
        varying vec2 uvs;
        varying vec3 vUv;
        
        void main(){
            vUv = position;
            uvs = uv;
            
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);

            gl_Position = projectionMatrix * modelViewPosition;
        }
    
    `
}

function fragmentShader(){
    return `
        #define MAX_STEPS 100
        #define MAX_DIST 100.
        #define SURF_DIST .001

        uniform vec3 color;
        uniform bool cycle;
        uniform float speed;
        uniform float smooth;
        uniform float time;
        varying vec3 camerPosition;

        varying vec2 uvs;

        float smin(float a, float b, float t) {
            float h = clamp(.5 + .5 * (b - a) / t, 0., 1.);
            return mix(b, a, h) - t * h * (1. - h);
        }

        vec3 roty(vec3 pos, float a) {
            mat3 rotation = mat3(cos(a), 0, sin(a), 0, 1, 0, -sin(a), 0, cos(a));

            return vec3(rotation * pos);
        }

        float GetDist (vec3 p) {
            float t = time * .007;

            //Medium Sphere
            float k = 5. / 7.;
            vec3 rose = vec3(cos(k * t) * cos(t), cos(k * t) * sin(t), 0.);
            float d1 = length(p + rose) - .5;
            
            //Biggest Sphere
            vec3 figEight = vec3(sin(t) * 1.5, sin(t) * cos(t), 0.);
            float d2 = length(p + roty(figEight * .4, t * 0.1)) - .75;

            //Smallest Sphere
            k = 6.;
            float tAdj = .3;
            rose = vec3(cos(k * t * tAdj) * cos(t * tAdj), - cos(k * t * tAdj) * sin(t * tAdj), 0.);
            float d3 = length(p + roty(rose, t * .1)) - .25;

            float d = smin(d1, d2, smooth);
            d = smin(d, d3, smooth);
            return d; //length(max(abs(roty(p, t)) - .5, 0.));
        }

        float RayMarch (vec3 origin, vec3 dir) {
            float depth = 0.;
            float dist;
            for (int i = 0; i < MAX_STEPS; i++) {
                vec3 p = origin + depth * dir;
                dist = GetDist(p);
                depth += dist;
                if (dist < SURF_DIST || depth > MAX_DIST) break;
            }
            return depth;
        }

        vec3 GetNormal (vec3 p) {
            vec2 e = vec2(.01, 0.);
            vec3 n =  GetDist(p) - vec3(
                GetDist(p - e.xyy),
                GetDist(p - e.yxy),
                GetDist(p - e.yyx)
            );

            return normalize(n);
        }

        vec3 hsv2rgb( vec3 c ) {

            vec4 K = vec4( 1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0 );
            vec3 p = abs( fract( c.xxx + K.xyz ) * 6.0 - K.www );
            return c.z * mix( K.xxx, clamp( p - K.xxx, 0.0, 1.0 ), c.y );

        }

        void main() {
            vec2 uv = uvs - .5;
            vec3 cam = vec3(0, 0, -6);//cameraPosition;
            vec3 rayDir = normalize(vec3(uv.x, uv.y, 1.));

            float d = RayMarch(cam, rayDir);
            vec4 col;

            if (d < MAX_DIST){
                vec3 p = cam + rayDir * d;
                vec3 n = GetNormal(p) * .5 + .5;
                if (cycle)
                    col.rgb = hsv2rgb(vec3((n.x + n.z + time / speed) / 5., color.y, color.z));
                else 
                    col.rgb = hsv2rgb(vec3( (n.x + n.z + (5. * color.x - .4)) / 5., color.y, color.z ) );
            }else {discard;}

            gl_FragColor = col; //vec4(uvs.x, uvs.y, 0, 1.);
            //gl_FragColor = vec4(mix(colorA, colorB, vUv.z), 1.0);
        }
    
    `
}

function animationLoop() {
    renderer.render(scene, camera)

    var elapsedMilliseconds = Date.now() - startTime;
	var elapsedSeconds = elapsedMilliseconds / 1000.;
    uniforms.time.value = 60. * elapsedSeconds;


    uniforms.color = {type: 'vec3', value: new THREE.Vector3(color.h, color.s, color.v)}
	uniforms.cycle = {type: 'bool', value: cycle};
	uniforms.speed = {type: 'float', value: speed};
	uniforms.smooth = {type: 'float', value: smooth};

    requestAnimationFrame(animationLoop);
}