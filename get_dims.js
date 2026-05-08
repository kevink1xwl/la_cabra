const { createCanvas, loadImage } = require('canvas');
loadImage('la_cabra.png').then((img) => {
    console.log(`Width: ${img.width}, Height: ${img.height}`);
}).catch(err => console.error(err));
