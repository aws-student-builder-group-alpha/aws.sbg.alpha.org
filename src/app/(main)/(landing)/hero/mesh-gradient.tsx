"use client"

import { useEffect, useRef } from "react"

interface WaveLayer {
	baseY: number
	amplitude: number
	frequency: number
	speed: number
	innerColor: [number, number, number]
	outerColor: [number, number, number]
	phase: number
	mouseInfluence: number
}

const WAVE_LAYERS: Omit<WaveLayer, "baseY" | "amplitude">[] = [
	// Back layer — deepest, widest wave
	{
		frequency: 0.003,
		speed: 0.4,
		innerColor: [40, 30, 160],
		outerColor: [255, 100, 0],
		phase: 0,
		mouseInfluence: 0.3,
	},
	// Mid layer — red-orange
	{
		frequency: 0.004,
		speed: 0.3,
		innerColor: [50, 40, 190],
		outerColor: [255, 60, 10],
		phase: 2.0,
		mouseInfluence: 0.5,
	},
	// Front layer — amber/yellow
	{
		frequency: 0.005,
		speed: 0.5,
		innerColor: [60, 50, 200],
		outerColor: [255, 140, 0],
		phase: 4.0,
		mouseInfluence: 0.7,
	},
	// Accent layer — purple tint
	{
		frequency: 0.006,
		speed: 0.35,
		innerColor: [80, 30, 180],
		outerColor: [200, 60, 40],
		phase: 1.5,
		mouseInfluence: 0.4,
	},
]

export default function MeshGradient() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const mouseRef = useRef({ x: 0.5, y: 0.8, active: false })
	const rafRef = useRef<number>(0)
	const timeRef = useRef(0)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext("2d", { alpha: false })
		if (!ctx) return

		let w = 0
		let h = 0
		let visible = true
		let lastFrame = 0
		let layers: WaveLayer[] = []
		const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
		const coarsePointer = window.matchMedia("(pointer: coarse)")

		const resize = () => {
			const parent = canvas.parentElement
			if (!parent) return
			const dpr = Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1.25 : 1.5)
			w = parent.clientWidth
			h = parent.clientHeight
			canvas.width = w * dpr
			canvas.height = h * dpr
			canvas.style.width = `${w}px`
			canvas.style.height = `${h}px`
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			layers = WAVE_LAYERS.map((layer, i) => ({
				...layer,
				baseY: h * (0.7 + i * 0.06),
				amplitude: h * (0.08 + i * 0.015),
			}))
		}

		resize()

		const handleMouse = (e: MouseEvent) => {
			if (motion.matches || coarsePointer.matches) return
			const rect = canvas.getBoundingClientRect()
			mouseRef.current = {
				x: (e.clientX - rect.left) / rect.width,
				y: (e.clientY - rect.top) / rect.height,
				active: true,
			}
		}

		const handleLeave = () => {
			mouseRef.current.active = false
		}

		const section = canvas.closest("section")
		if (section) {
			section.addEventListener(
				"mousemove",
				handleMouse,
			)
			section.addEventListener(
				"mouseleave",
				handleLeave,
			)
		}

		const drawWave = (
			layer: WaveLayer,
			t: number,
			mouseX: number,
			mouseY: number,
			mouseActive: boolean,
		) => {
			const [ir, ig, ib] = layer.innerColor
			const [or, og, ob] = layer.outerColor

			// Mouse offset for the wave
			let mxOffset = 0
			let myOffset = 0
			if (mouseActive) {
				mxOffset =
					(mouseX - 0.5) *
					200 *
					layer.mouseInfluence
				myOffset =
					(mouseY - 0.5) *
					-40 *
					layer.mouseInfluence
			}

			ctx.beginPath()
			ctx.moveTo(0, h)

			// Draw the wave top edge
			const step = 4
			for (let x = 0; x <= w; x += step) {
				const nx = x / w
				// Multiple sine waves for organic shape
				const wave1 = Math.sin(
					x * layer.frequency +
						t * layer.speed +
						layer.phase +
						mxOffset * 0.003,
				)
				const wave2 =
					Math.sin(
						x * layer.frequency * 2.3 +
							t * layer.speed * 0.7 +
							layer.phase * 1.5,
					) * 0.5
				const wave3 =
					Math.sin(
						x * layer.frequency * 0.6 +
							t * layer.speed * 1.3 +
							layer.phase * 0.8,
					) * 0.35

				// Mouse proximity creates a bump
				let mouseBump = 0
				if (mouseActive) {
					const dist = Math.abs(nx - mouseX)
					mouseBump =
						Math.exp(-dist * dist * 12) *
						myOffset
				}

				const waveY =
					layer.baseY +
					(wave1 + wave2 + wave3) *
						layer.amplitude +
					mouseBump

				ctx.lineTo(x, waveY)
			}

			ctx.lineTo(w, h)
			ctx.closePath()

			// Vertical gradient fill — thermal look
			const grad = ctx.createLinearGradient(
				0,
				layer.baseY - layer.amplitude * 2,
				0,
				h,
			)
			grad.addColorStop(
				0,
				`rgba(${or},${og},${ob},0)`,
			)
			grad.addColorStop(
				0.15,
				`rgba(${or},${og},${ob},0.7)`,
			)
			grad.addColorStop(
				0.35,
				`rgb(${or},${og},${ob})`,
			)
			grad.addColorStop(
				0.55,
				`rgb(${Math.round((ir + or) / 2)},${Math.round((ig + og) / 2)},${Math.round((ib + ob) / 2)})`,
			)
			grad.addColorStop(
				0.8,
				`rgb(${ir},${ig},${ib})`,
			)
			grad.addColorStop(
				1,
				`rgb(${ir},${ig},${ib})`,
			)

			ctx.globalCompositeOperation = "screen"
			ctx.fillStyle = grad
			ctx.fill()
		}

		const draw = () => {
			const t = timeRef.current
			const mouse = mouseRef.current

			ctx.globalCompositeOperation = "source-over"
			ctx.fillStyle = "#000"
			ctx.fillRect(0, 0, w, h)

			for (const wave of layers) {
				drawWave(
					wave,
					t,
					mouse.x,
					mouse.y,
					mouse.active,
				)
			}

		}

		const animate = (now: number) => {
			rafRef.current = 0
			if (!visible || document.hidden || motion.matches) return
			const interval = 1000 / (coarsePointer.matches ? 30 : 60)
			if (!lastFrame || now - lastFrame >= interval - 1) {
				if (lastFrame) timeRef.current += Math.min((now - lastFrame) / 1000, 0.1) * 1.2
				lastFrame = now
				draw()
			}
			rafRef.current = requestAnimationFrame(animate)
		}
		const sync = () => {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = 0
			lastFrame = 0
			draw()
			if (visible && !document.hidden && !motion.matches) rafRef.current = requestAnimationFrame(animate)
		}
		const onResize = () => { resize(); sync() }
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting
			sync()
		})
		observer.observe(canvas)
		window.addEventListener("resize", onResize)
		document.addEventListener("visibilitychange", sync)
		motion.addEventListener("change", sync)
		coarsePointer.addEventListener("change", onResize)
		sync()

		return () => {
			cancelAnimationFrame(rafRef.current)
			observer.disconnect()
			window.removeEventListener("resize", onResize)
			document.removeEventListener("visibilitychange", sync)
			motion.removeEventListener("change", sync)
			coarsePointer.removeEventListener("change", onResize)
			if (section) {
				section.removeEventListener(
					"mousemove",
					handleMouse,
				)
				section.removeEventListener(
					"mouseleave",
					handleLeave,
				)
			}
		}
	}, [])

	return (
		<canvas
			ref={canvasRef}
			aria-hidden="true"
			className="absolute inset-0 w-full h-full"
			style={{
				filter: "blur(20px) contrast(1.2)",
			}}
		/>
	)
}
