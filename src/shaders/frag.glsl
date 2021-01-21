precision mediump float;

#define maxColumns 16384

uniform int numTextures;
uniform sampler2D u_texture;
uniform float scrolled;
uniform float viewportWidth;
uniform float viewportHeight;
uniform vec4 backgroundColor;
vec4 getTexColor(){
    vec2 uv;
    float fnt=float(numTextures);
    for(int i=0;i<maxColumns;i++){
        if(i>=numTextures)return vec4(1.,0.,1.,1.);
        float fi=float(i);
        if(scrolled<(viewportHeight*(fi+1.))-gl_FragCoord.y){
            uv=vec2((gl_FragCoord.x+(fi*viewportWidth))/(viewportWidth*fnt),gl_FragCoord.y/viewportHeight+((scrolled-(viewportHeight*fi))/viewportHeight));
            return texture2D(u_texture,uv);
        }
    }
}
void main(){
    vec4 col=getTexColor();
    if(col.a==0.)col=backgroundColor;
    gl_FragColor=col;
}