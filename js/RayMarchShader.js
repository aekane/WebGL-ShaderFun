
var scene = new THREE.Scene()

camera = new THREE.PerspectiveCamera(75, window.innerWidth/ window.innerHeight, 0.1, 1000);
camera.position.z = .6;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

let uniforms = {}

addPlane()

var startTime = Date.now();
animationLoop()


function addPlane() {
    //uniforms.colorA = {type: 'vec3', value: new THREE.Color(0x74ebd5)}
    //uniforms.colorB = {type: 'vec3', value: new THREE.Color(0xACB6E5)}
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

        uniform float time;
        varying vec3 camerPosition;

        varying vec2 uvs;

        float smin(float a, float b, float t) {
            float h = clamp(.5 + .5 * (b - a) / t, 0., 1.);
            return mix(b, a, h) - t * h * (1. - h);
        }

        vec3 rotz(vec3 pos, float a) {
            mat3 rotation = mat3(cos(a), -sin(a), 0, sin(a), cos(a), 0, 0, 0, 1);

            vec3 r = vec3(rotation * pos);

            return r;
        }

        float GetDist (vec3 p) {
            float t = (time * .01);
            //float sinF = (sin(sin(5. * t) + sin(10. * t) + sin(4. * 3.1415 * t)));

            vec3 d1Pos = vec3(sin(t) * .2, 0, -cos(t + 3.1415));
            
            vec3 d2Pos = vec3(sin(t) * 1.2, 0, cos(t + 3.1415) * .8);
            d2Pos = rotz(d2Pos, time * .0004);
            
            vec3 d3Pos = vec3(-sin(t + 2.) * 1.1, 0, cos(t + 5.1415) * .7);
            d3Pos = rotz(d3Pos, -time * .0004);


            float d1 = length(p + d1Pos) - .75;
            float d2 = length(p + d2Pos) - .5;
            float d3 = length(p + d3Pos) - .25;
            
            float d = smin(d1, d2, .4);
            d = smin(d, d3, .4);
            return d;
        }

        float RayMarch (vec3 origin, vec3 dir) {
            float dO = 0.;
            float dS;
            for (int i = 0; i < MAX_STEPS; i++) {
                vec3 p = origin + dO * dir;
                dS = GetDist(p);
                dO += dS;
                if (dS < SURF_DIST || dO > MAX_DIST) break;
            }
            return dO;
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

        void main() {
            vec2 uv = uvs - .5;
            vec3 cam = vec3(0, 0, -6);//cameraPosition;
            vec3 rayDir = normalize(vec3(uv.x, uv.y, 1.));

            float d = RayMarch(cam, rayDir);
            vec4 col;

            if (d < MAX_DIST){
                vec3 p = cam + rayDir * d;
                vec3 n = GetNormal(p) * .5 + .5;
                col.rgb = n;
            }

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
    
    requestAnimationFrame(animationLoop)
}