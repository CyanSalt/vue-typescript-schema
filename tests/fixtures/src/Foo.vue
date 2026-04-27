<script lang="ts" setup>
defineProps<{
  propAny: any,
  propUnknown: unknown,
  propNever: never,
  propNull: null,
  propUndefined: undefined,
  propBoolean: boolean,
  propString: string,
  propNumber: number,
  propBooleanLiteral: true,
  propStringLiteral: 'hello',
  propNumberLiteral: 42,
  propArray: string[],
  propObject: {
    propObjectStringProperty: 'hello',
    [propObjectIndex: string]: string,
  },
  get propGetter(): string;
  readonly propReadOnly: number;
  propOptional?: boolean;
  propUnion: string | number;
  propIntersection: { propIntersectionAProperty: string } & { propIntersectionBProperty: number };
  propUnionIntersection: boolean | ({ propUnionIntersectionAProperty: string } & { propUnionIntersectionBProperty: number });
  propRecord: Record<string, number>;
  /**
   * This is a string.
   * @remarks
   * Greet users pleasantly
   * - Express sincerity
   * - Use elegant language
   * @default 'hello'
   */
  propWithComment?: string;
}>()
</script>

<template>
  <div class="foo"></div>
</template>
