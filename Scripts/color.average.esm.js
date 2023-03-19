/* This is a modification of the
original color.js library by luudvk, 
https://github.com/luukdv/color.js
focusing only on the average function
for the sake of improved perfomance */

export default (item) => new Promise((resolve, reject) => new Promise((resolve, reject) => {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	const img = new Image();
	img.onload = () => {
		canvas.height = img.height;
		canvas.width = img.width;
		context.drawImage(img, 0, 0);
		resolve(context.getImageData(0, 0, img.width, img.height).data);
	};
	img.crossOrigin='';
	img.src = typeof item === 'string' ? item : item.src;
}).then(data => {
	const amount = data.length / 40;
	const rgb = { r: 0, g: 0, b: 0 };
	for (let i = 0; i < data.length; i += 40){
		rgb.r += data[i];
		rgb.g += data[i + 1];
		rgb.b += data[i + 2];
	}
	const list = [[Math.round(rgb.r / amount), Math.round(rgb.g / amount), Math.round(rgb.b / amount)]].map(val => Array.isArray(val) ? val : val.split(',').map(Number));
	return resolve(list.length === 1 ? list[0] : list);
}).catch(error => reject(error)));