/* eslint-disable @typescript-eslint/prefer-enum-initializers */
type TUnion = string | number

interface IInterface {
  interfaceProperty: string,
  interfaceOptionalProperty?: boolean,
}

enum EStringEnum {
  Value1 = 'Value1',
  Value2 = 'Value2',
}

enum EImplicitEnum {
  Value1,
  Value2,
}

export interface Props {
  propUnion: TUnion,
  propInterface: IInterface,
  propStringEnum: EStringEnum,
  propImplicitEnum: EImplicitEnum,
  propNested: Record<string, TUnion>,
}
