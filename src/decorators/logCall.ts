export function logCalls(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<Function>
) {
  let method = descriptor.value!;

  descriptor.value = function () {
    console.debug(propertyName, arguments);
    return method.apply(this, arguments);
  };
}
