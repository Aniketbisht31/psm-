import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  category: z.enum(['health', 'education', 'mindfulness', 'productivity']),
  type: z.enum(['positive', 'negative']),
  target_value: z.number().min(1, 'Target must be at least 1'),
  unit: z.enum(['minutes', 'hours', 'pages', 'reps', 'km']),
  frequency: z.enum(['daily', 'weekly', 'weekdays']),
  visibility: z.enum(['public', 'followers', 'private']),
});

type FormValues = z.infer<typeof schema>;

export default function CreateHabitScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: 'health',
      type: 'positive',
      target_value: 1,
      unit: 'minutes',
      frequency: 'daily',
      visibility: 'public',
    },
  });

  const onNext = () => {
    // simple validation per-step
    if (step === 1) {
      const name = getValues('name');
      if (!name || name.trim() === '') {
        Alert.alert('Validation', 'Please enter a habit name');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const onBack = () => setStep((s) => Math.max(1, s - 1));

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Must be logged in');

      // Map 'weekdays' to 'weekly' (DB supports daily|weekly|monthly)
      const frequency = values.frequency === 'weekdays' ? 'weekly' : values.frequency;

      const insertPayload = {
        user_id: userId,
        name: values.name.trim(),
        description: values.description || null,
        category: values.category,
        type: values.type,
        target_value: values.target_value,
        unit: values.unit,
        frequency,
        visibility: values.visibility,
        is_active: true,
      } as any;

      const { error } = await supabase.from('habits').insert(insertPayload);
      if (error) throw error;

      // Navigate to feed (root)
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Habit</Text>

      {step === 1 && (
        <View>
          <Text style={styles.label}>Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="e.g. Read 20 pages"
              />
            )}
          />
          {errors.name && <Text style={styles.error}>{errors.name.message?.toString()}</Text>}

          <Text style={styles.label}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.textarea]}
                onChangeText={onChange}
                value={value as string}
                placeholder="Optional description"
                multiline
                numberOfLines={4}
              />
            )}
          />
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.label}>Category</Text>
          <View style={styles.grid}>
            {[
              { key: 'health', label: 'Health' },
              { key: 'education', label: 'Learning' },
              { key: 'mindfulness', label: 'Mindfulness' },
              { key: 'productivity', label: 'Productivity' },
            ].map((c) => (
              <TouchableOpacity
                key={c.key}
                style={styles.tile}
                onPress={() => setValue('category', c.key as any)}
              >
                <Text>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Type</Text>
          <View style={{ flexDirection: 'row' }}>
            {['positive', 'negative'].map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.toggle}
                onPress={() => setValue('type', t as any)}
              >
                <Text>{t === 'positive' ? 'Positive' : 'Negative'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.label}>Target Value</Text>
          <Controller
            control={control}
            name="target_value"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(value)}
                onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '') || 0))}
              />
            )}
          />
          {errors.target_value && <Text style={styles.error}>{errors.target_value.message?.toString()}</Text>}

          <Text style={styles.label}>Unit</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['minutes', 'hours', 'pages', 'reps', 'km'].map((u) => (
              <TouchableOpacity key={u} style={styles.tile} onPress={() => setValue('unit', u as any)}>
                <Text>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Frequency</Text>
          <View style={{ flexDirection: 'row' }}>
            {['daily', 'weekly', 'weekdays'].map((f) => (
              <TouchableOpacity key={f} style={styles.toggle} onPress={() => setValue('frequency', f as any)}>
                <Text>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={styles.label}>Visibility</Text>
          <View style={{ flexDirection: 'row' }}>
            {['public', 'followers', 'private'].map((v) => (
              <TouchableOpacity key={v} style={styles.tile} onPress={() => setValue('visibility', v as any)}>
                <Text>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {step > 1 ? (
          <TouchableOpacity onPress={onBack} style={styles.footerButton}>
            <Text>Back</Text>
          </TouchableOpacity>
        ) : null}

        {step < 4 ? (
          <TouchableOpacity onPress={onNext} style={[styles.footerButton, styles.primary]}>
            <Text style={{ color: '#fff' }}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSubmit(onSubmit)} style={[styles.footerButton, styles.primary]} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Create</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginBottom: 8 },
  textarea: { height: 100, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 8 },
  toggle: { padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginRight: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  footerButton: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', minWidth: 100, alignItems: 'center' },
  primary: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  error: { color: 'red', marginBottom: 8 },
});
