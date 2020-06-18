import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';

const config = {};
let math = mathjs.create(mathjs.all, config);

function load() {
  math = mathjs.create(mathjs.all, config);
}

function variables(variables) {
  math.import({
    ...variables
  }, { override: true, silent: true });
}

export { math };
export default { load, variables };