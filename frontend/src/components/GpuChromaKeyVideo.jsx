import { useEffect, useRef, useState } from 'react';

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_video;
  uniform float u_sensitivity;
  uniform float u_smoothness;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_video, v_texCoord);
    float maxRB = max(color.r, color.b);
    float greenDiff = color.g - maxRB;
    float hardThreshold = u_sensitivity / 255.0;
    float softThreshold = max((u_sensitivity - u_smoothness) / 255.0, 0.0);
    float alpha = 1.0;

    if (color.g > (60.0 / 255.0) && greenDiff > hardThreshold) {
      alpha = 0.0;
    } else if (color.g > (50.0 / 255.0) && greenDiff > softThreshold) {
      float feather = max(hardThreshold - softThreshold, 0.001);
      alpha = 1.0 - clamp((greenDiff - softThreshold) / feather, 0.0, 1.0);
      color.g = maxRB;
    }

    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Không thể tạo chroma-key shader.');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || 'Không thể compile chroma-key shader.');
  }

  return shader;
}

function createProgram(gl) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  let fragmentShader;
  let program;

  try {
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!program) throw new Error('Không thể tạo chroma-key program.');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
  } finally {
    gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
  }

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || 'Không thể link chroma-key shader.');
  }

  return program;
}

export default function GpuChromaKeyVideo({
  mp4Src,
  webmSrc,
  posterSrc,
  sensitivity,
  smoothness,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const readyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const handleContextLost = (event) => {
      event.preventDefault();
      readyRef.current = false;
      setIsReady(false);
    };
    const handleContextRestored = () => {
      setContextVersion((version) => version + 1);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!container || !video || !canvas) return undefined;

    const contextOptions = {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    };
    const gl = canvas.getContext('webgl', contextOptions)
      || canvas.getContext('experimental-webgl', contextOptions);

    if (!gl) return undefined;

    let program;
    let positionBuffer;
    let texture;
    let videoFrameId = null;
    let animationFrameId = null;
    let running = false;

    try {
      program = createProgram(gl);
      positionBuffer = gl.createBuffer();
      texture = gl.createTexture();
      if (!positionBuffer || !texture) {
        throw new Error('Không thể tạo buffer hoặc texture cho video AI.');
      }

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
        -1,  1, 0, 1,
         1, -1, 1, 0,
         1,  1, 1, 1,
      ]), gl.STATIC_DRAW);

      const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(
        texCoordLocation,
        2,
        gl.FLOAT,
        false,
        stride,
        2 * Float32Array.BYTES_PER_ELEMENT,
      );

      gl.uniform1f(gl.getUniformLocation(program, 'u_sensitivity'), sensitivity);
      gl.uniform1f(gl.getUniformLocation(program, 'u_smoothness'), smoothness);
      gl.uniform1i(gl.getUniformLocation(program, 'u_video'), 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.clearColor(0, 0, 0, 0);
    } catch (error) {
      console.warn('Không thể khởi tạo GPU chroma-key:', error);
      if (texture) gl.deleteTexture(texture);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (program) gl.deleteProgram(program);
      return undefined;
    }

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
      }
    };

    const drawFrame = () => {
      if (!running || document.hidden || video.paused || video.ended) {
        running = false;
        return;
      }

      resizeCanvas();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      try {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video,
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (!readyRef.current) {
          readyRef.current = true;
          setIsReady(true);
        }
      } catch (error) {
        console.warn('Không thể đưa video AI lên GPU:', error);
        running = false;
        readyRef.current = false;
        setIsReady(false);
        return;
      }

      if ('requestVideoFrameCallback' in video) {
        videoFrameId = video.requestVideoFrameCallback(drawFrame);
      } else {
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    const startRendering = () => {
      if (running || document.hidden || video.paused || video.ended) return;
      running = true;

      if ('requestVideoFrameCallback' in video) {
        videoFrameId = video.requestVideoFrameCallback(drawFrame);
      } else {
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    const stopRendering = () => {
      running = false;
      if (videoFrameId !== null && 'cancelVideoFrameCallback' in video) {
        video.cancelVideoFrameCallback(videoFrameId);
        videoFrameId = null;
      }
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopRendering();
        video.pause();
      } else {
        video.play().then(startRendering).catch(() => {});
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resizeCanvas)
      : null;
    resizeObserver?.observe(container);
    if (!resizeObserver) window.addEventListener('resize', resizeCanvas, { passive: true });
    video.addEventListener('play', startRendering);
    video.addEventListener('pause', stopRendering);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resizeCanvas();
    video.play().then(startRendering).catch(() => {});

    return () => {
      stopRendering();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resizeCanvas);
      video.removeEventListener('play', startRendering);
      video.removeEventListener('pause', stopRendering);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    };
  }, [contextVersion, mp4Src, sensitivity, smoothness, webmSrc]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <img
        src={posterSrc}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-fill pointer-events-none transition-opacity duration-150 ${isReady ? 'opacity-0' : 'opacity-100'}`}
      />
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        aria-hidden="true"
        className="absolute w-px h-px opacity-0 pointer-events-none"
      >
        <source src={mp4Src} type="video/mp4" />
        <source src={webmSrc} type="video/webm" />
      </video>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
        aria-hidden="true"
      />
    </div>
  );
}
