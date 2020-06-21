import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';

let math = mathjs.create(mathjs.all);

function reloadMath() {
  math = mathjs.create(mathjs.all);
}

export { reloadMath };
export default math;