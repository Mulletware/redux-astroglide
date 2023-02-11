import checkPropTypes from "check-prop-types";

export const checkPropType = (
  propType: any,
  value: any,
  name: string,
  extraProps: object = {}
) => {
  return checkPropTypes(
    { [name]: propType },
    { ...extraProps, [name]: value },
    name,
    undefined
  );
};

export const checkProp = (
  propType: any,
  value: any,
  name: string,
  shouldTypeErrorPreventUpdate: boolean = false
) => {
  const result = checkPropType(propType, value, name);
  if (result) {
    const errorText = `Astroglide: prop  ${name}  with value  ${value}  is not of the specified type`;

    if (shouldTypeErrorPreventUpdate) {
      throw Error(errorText);
    } else {
      console.warn(errorText);
    }

    return result;
  }

  return false;
};
