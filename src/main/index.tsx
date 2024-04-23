import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { audioStream, toWave } from './recorder'

type RecordState = 'Stop' | 'Recording'

function App() {
	const [state, setState] = useState<RecordState>('Stop')
	const [list, setList] = useState<string[]>([])
	useEffect(() => {
		if (state === 'Recording') {
			const stream = audioStream()
			toWave(stream, {
				sampleRate: 16000,
				channels: 1,
				bitDepth: 16
			}).then(buffers => {
				const blob = new Blob(buffers, { type: 'audio/wav' })
				const url = URL.createObjectURL(blob)
				setList([url, ...list]) 
			})
			return stream.complete.bind(stream)
		}
		return 
	}, [state])

	function toggle() {
		if (state === 'Stop') setState('Recording')
		else setState('Stop')
	}

	function buttonText() {
		if (state === 'Stop') return 'Start'
		else return 'Stop'
	}

	return <div>
		Hello, World!
		<button onClick={toggle}>
			{buttonText()}
		</button>
		<ul>
			{list.map((item, index) => {
				return <li key={index}>
					<audio controls src={item} />
					<a href={item} download={`recording-${index}.wav`}>Save</a>
				</li>
			})}
		</ul>
	</div>
}

const root = createRoot(document.getElementById('app')!);
root.render(<App />)
