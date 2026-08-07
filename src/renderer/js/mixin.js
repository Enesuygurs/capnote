// Copies the methods of feature classes onto a target class, refusing duplicate names
export function applyFeatures(target, features) {
  features.forEach((Feature) => {
    Object.getOwnPropertyNames(Feature.prototype).forEach((name) => {
      if (name === 'constructor') return;
      if (Object.prototype.hasOwnProperty.call(target.prototype, name)) {
        throw new Error(`${Feature.name}.${name} is already defined on ${target.name}`);
      }
      Object.defineProperty(
        target.prototype,
        name,
        Object.getOwnPropertyDescriptor(Feature.prototype, name)
      );
    });
  });
}
