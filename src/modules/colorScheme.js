
export function* randomize(colors, numberOfColors, level = 4) {
    const offset = Math.random() * colors.length
    for(let i = 0; i < colors.length; i += colors.length / numberOfColors)
        yield colors[Math.floor((i + offset) % colors.length)][level]
}