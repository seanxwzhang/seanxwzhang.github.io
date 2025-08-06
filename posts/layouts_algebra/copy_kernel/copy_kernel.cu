// nvcc -std=c++20 -gencode arch=compute_80,code=sm_80 copy_kernel.cu -o copy_kernel -I cutlass/include && ./copy_kernel
#include <functional>
#include <iostream>
#include <string>
#include <vector>
#include <cuda_runtime.h>
#include <cute/tensor.hpp>

using namespace cute;

#define CHECK_CUDA_ERROR(val) check((val), #val, __FILE__, __LINE__)
void check(cudaError_t err, const char* const func, const char* const file,
           const int line)
{
    if (err != cudaSuccess)
    {
        std::cerr << "CUDA Runtime Error at: " << file << ":" << line
                  << std::endl;
        std::cerr << cudaGetErrorString(err) << " " << func << std::endl;
        std::exit(EXIT_FAILURE);
    }
}

#define CHECK_LAST_CUDA_ERROR() checkLast(__FILE__, __LINE__)
void checkLast(const char* const file, const int line)
{
    cudaError_t const err{cudaGetLastError()};
    if (err != cudaSuccess)
    {
        std::cerr << "CUDA Runtime Error at: " << file << ":" << line
                  << std::endl;
        std::cerr << cudaGetErrorString(err) << std::endl;
        std::exit(EXIT_FAILURE);
    }
}

__global__ void copy_kernel_v0(float *src, float *dst, int width, int height, int stride_x_src, int stride_y_src, int stride_x_dst, int stride_y_dst) {
    const int block_size = blockDim.x;
    const int tid = threadIdx.x;
    const int element_per_thread = width * height / block_size;
    for (int i = 0; i < element_per_thread; i++) {
        const int x = (tid * element_per_thread + i) % width;
        const int y = (tid * element_per_thread + i) / width;
        dst[y * stride_y_dst + x * stride_x_dst] = src[y * stride_y_src + x * stride_x_src];
    }
}

__global__ void copy_kernel_v0_strided(float *src, float *dst, int width, int height, int stride_x_src, int stride_y_src, int stride_x_dst, int stride_y_dst) {
    const int block_size = blockDim.x;
    const int tid = threadIdx.x;
    const int element_per_thread = width * height / block_size;
    for (int i = 0; i < element_per_thread; i++) {
        const int x = (i * block_size + tid) % width;
        const int y = (i * block_size + tid) / width;
        dst[y * stride_y_dst + x * stride_x_dst] = src[y * stride_y_src + x * stride_x_src];
    }
}

template <typename SrcLayout, typename DstLayout>
__global__ void copy_kernel_v1(float *src, float *dst) {
    constexpr auto l1 = SrcLayout{};
    constexpr auto l2 = DstLayout{};
    constexpr int width = get<0>(shape(l1));
    constexpr int height = get<1>(shape(l1));
    const int block_size = blockDim.x;
    const int tid = threadIdx.x;
    const int element_per_thread = width * height / block_size;
    #pragma unroll
    for (int i = 0; i < element_per_thread; i++) {
        const int x = (tid * element_per_thread + i) % width;
        const int y = (tid * element_per_thread + i) / width;
        dst[l2(x, y)] = src[l1(x, y)];
    }
}

template <typename SrcLayout, typename DstLayout, typename FrgThr>
__global__ void copy_kernel_v2(float *src, float *dst) {
    constexpr auto l1 = SrcLayout{};
    constexpr auto l2 = DstLayout{};
    constexpr auto frgthr = FrgThr{};
    const int tid = threadIdx.x;
    #pragma unroll
    for (int i = 0; i < size<0>(frgthr); i++) {
        dst[l2(frgthr(i, tid))] = src[l1(frgthr(i, tid))];
    }
}

enum struct Flavor {
    TILE,
    STRIDE,
    LAYOUT_TILE,
    FRGTHR,
    FRGTHR_STRIDE
};

#define FLAVOR_SWITCH(flavor, CONST_NAME, ...)                     \
[&] {                                                           \
    if (flavor == Flavor::TILE)                               \
    {                                                           \
        constexpr static Flavor CONST_NAME = Flavor::TILE;    \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (flavor == Flavor::LAYOUT_TILE)                          \
    {                                                           \
        constexpr static Flavor CONST_NAME = Flavor::LAYOUT_TILE;    \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (flavor == Flavor::FRGTHR)                          \
    {                                                           \
        constexpr static Flavor CONST_NAME = Flavor::FRGTHR;    \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (flavor == Flavor::STRIDE)                          \
    {                                                           \
        constexpr static Flavor CONST_NAME = Flavor::STRIDE;    \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (flavor == Flavor::FRGTHR_STRIDE)                   \
    {                                                           \
        constexpr static Flavor CONST_NAME = Flavor::FRGTHR_STRIDE; \
        return __VA_ARGS__();                                   \
    }                                                           \
    else                                                        \
    {                                                           \
        std::cerr << "Unsupported flavor"         << std::endl; \
        std::exit(EXIT_FAILURE);                                \
    }                                                           \
}()

#define SIZE_SWITCH(size, CONST_NAME, ...)                      \
[&] {                                                           \
    if (size == 8)                                             \
    {                                                           \
        constexpr static int CONST_NAME = 8;                   \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 16)                                        \
    {                                                           \
        constexpr static int CONST_NAME = 16;                  \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 32)                                        \
    {                                                           \
        constexpr static int CONST_NAME = 32;                  \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 64)                                        \
    {                                                           \
        constexpr static int CONST_NAME = 64;                  \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 128)                                       \
    {                                                           \
        constexpr static int CONST_NAME = 128;                 \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 256)                                       \
    {                                                           \
        constexpr static int CONST_NAME = 256;                 \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 512)                                       \
    {                                                           \
        constexpr static int CONST_NAME = 512;                 \
        return __VA_ARGS__();                                   \
    }                                                           \
    else if (size == 1024)                                      \
    {                                                           \
        constexpr static int CONST_NAME = 1024;                \
        return __VA_ARGS__();                                   \
    }                                                           \
    else                                                        \
    {                                                           \
        std::cerr << "Unsupported size: " << size << std::endl; \
        std::exit(EXIT_FAILURE);                                \
    }                                                           \
}()

template <int width, int height, int thread_num, typename T>
void prepare(T **src, T **dst) {
    cudaMallocManaged(src, width * height * sizeof(T));
    cudaMallocManaged(dst, width * height * sizeof(T));
    for (int i = 0; i < width * height; i++) {
        (*src)[i] = static_cast<T>(i);
    }
    cudaMemset(*dst, static_cast<T>(0), width * height * sizeof(T));
}

template <int width, int height, int thread_num, typename T>
int check_correctness(T *src, T *dst) {
    constexpr int stride_x_src = 1;
    constexpr int stride_y_src = width;
    constexpr int stride_x_dst = height;
    constexpr int stride_y_dst = 1;
    for (int x = 0; x < width; x++) {
        for (int y = 0; y < height; y++) {
            const int src_idx = y * stride_y_src + x * stride_x_src;
            const int dst_idx = y * stride_y_dst + x * stride_x_dst;
            if (dst[dst_idx] != src[src_idx]) {
                printf("Error: dst[%d, %d] = %f, src[%d, %d] = %f\n", x, y, dst[dst_idx], x, y, src[src_idx]);
                return 1;
            }
        }
    }
    return 0;
}

template <class T>
float measure_performance(std::function<void(cudaStream_t)> bound_function,
                          cudaStream_t stream, unsigned int num_repeats = 100,
                          unsigned int num_warmups = 100)
{
    cudaEvent_t start, stop;
    float time;

    CHECK_CUDA_ERROR(cudaEventCreate(&start));
    CHECK_CUDA_ERROR(cudaEventCreate(&stop));

    for (unsigned int i{0}; i < num_warmups; ++i)
    {
        bound_function(stream);
    }

    CHECK_CUDA_ERROR(cudaStreamSynchronize(stream));

    CHECK_CUDA_ERROR(cudaEventRecord(start, stream));
    for (unsigned int i{0}; i < num_repeats; ++i)
    {
        bound_function(stream);
    }
    CHECK_CUDA_ERROR(cudaEventRecord(stop, stream));
    CHECK_CUDA_ERROR(cudaEventSynchronize(stop));
    CHECK_LAST_CUDA_ERROR();
    CHECK_CUDA_ERROR(cudaEventElapsedTime(&time, start, stop));
    CHECK_CUDA_ERROR(cudaEventDestroy(start));
    CHECK_CUDA_ERROR(cudaEventDestroy(stop));

    float const latency{time / num_repeats};

    return latency;
}

template <int width, int height, int thread_num, Flavor flavor>
void run(float *src, float *dst, cudaStream_t stream = 0) {
    constexpr int stride_x_src = 1;
    constexpr int stride_y_src = width;
    constexpr int stride_x_dst = height;
    constexpr int stride_y_dst = 1;
    if constexpr (flavor == Flavor::TILE) {
        copy_kernel_v0<<<1, thread_num, 0, stream>>>(src, dst, width, height, stride_x_src, stride_y_src, stride_x_dst, stride_y_dst);
    } else if constexpr (flavor == Flavor::LAYOUT_TILE) {
        using src_layout = decltype(make_layout(Shape<Int<width>, Int<height>>{}, Stride<Int<stride_x_src>, Int<stride_y_src>>{}));
        using dst_layout = decltype(make_layout(Shape<Int<width>, Int<height>>{}, Stride<Int<stride_x_dst>, Int<stride_y_dst>>{}));
        copy_kernel_v1<src_layout, dst_layout><<<1, thread_num, 0, stream>>>(src, dst);
    } else if constexpr (flavor == Flavor::FRGTHR) {
        using src_layout = decltype(make_layout(Shape<Int<width>, Int<height>>{}, Stride<Int<stride_x_src>, Int<stride_y_src>>{}));
        using dst_layout = decltype(make_layout(Shape<Int<width>, Int<height>>{}, Stride<Int<stride_x_dst>, Int<stride_y_dst>>{}));
        using frgthr = decltype(make_layout(Shape<Int<width * height / thread_num>, Int<thread_num>>{}));
        copy_kernel_v2<src_layout, dst_layout, frgthr><<<1, thread_num, 0, stream>>>(src, dst);
    } else if constexpr (flavor == Flavor::STRIDE) {
        copy_kernel_v0_strided<<<1, thread_num, 0, stream>>>(src, dst, width, height, stride_x_src, stride_y_src, stride_x_dst, stride_y_dst);
    } else if constexpr (flavor == Flavor::FRGTHR_STRIDE) {
        using src_layout = decltype(make_layout(Shape<Int<width>, Int<height>>{}, Stride<Int<stride_x_src>, Int<stride_y_src>>{}));
        using dst_layout = decltype(make_layout(Shape<Int<width>, Int<height>>{}, Stride<Int<stride_x_dst>, Int<stride_y_dst>>{}));
        using frgthr = decltype(make_layout(Shape<Int<width * height / thread_num>, Int<thread_num>>{}, LayoutRight{}));
        copy_kernel_v2<src_layout, dst_layout, frgthr><<<1, thread_num, 0, stream>>>(src, dst);
    }

    CHECK_LAST_CUDA_ERROR();
}

template <int width, int height, int thread_num>
void run_all_flavors(float *src, float *dst, cudaStream_t stream) {
    const std::vector<std::pair<Flavor, std::string>> flavors = {
        {Flavor::TILE, "TILE"},
        {Flavor::STRIDE, "STRIDE"}, 
        {Flavor::LAYOUT_TILE, "LAYOUT_TILE"},
        {Flavor::FRGTHR, "FRGTHR"},
        {Flavor::FRGTHR_STRIDE, "FRGTHR_STRIDE"}
    };
    
    printf("Running all flavors for size %dx%d:\n", width, height);
    printf("=====================================\n");
    
    for (const auto& [flavor, name] : flavors) {
        printf("Testing %s flavor:\n", name.c_str());
        
        // Reset destination buffer
        cudaMemset(dst, 0, width * height * sizeof(float));
        
        // Create bound function for performance measurement
        auto run_bound = [&](cudaStream_t s) {
            FLAVOR_SWITCH(flavor, flavor_static, [&] {
                run<width, height, thread_num, flavor_static>(src, dst, s);
            });
        };
        
        // Measure performance
        float latency = measure_performance<void>(run_bound, stream);
        printf("  Average latency: %.3f ms\n", latency);
        
        // Synchronization and correctness check
        CHECK_CUDA_ERROR(cudaStreamSynchronize(stream));
        if (check_correctness<width, height, thread_num>(src, dst)) {
            printf("  Test FAILED\n");
        } else {
            printf("  Test PASSED\n");
        }
        printf("\n");
    }
}


void parse_args(int argc, char *argv[], int &size) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <size>" << std::endl;
        std::cerr << "Valid sizes: 8, 16, 32, 64, 128, 256, 512, 1024" << std::endl;
        std::exit(EXIT_FAILURE);
    }
    
    try {
        size = std::stoi(argv[1]);
    } catch (const std::exception& e) {
        std::cerr << "Invalid size: " << argv[1] << std::endl;
        std::cerr << "Valid sizes: 8, 16, 32, 64, 128, 256, 512, 1024" << std::endl;
        std::exit(EXIT_FAILURE);
    }
    
    // Validate size is one of the supported sizes
    if (size != 8 && size != 16 && size != 32 && size != 64 && 
        size != 128 && size != 256 && size != 512 && size != 1024) {
        std::cerr << "Unsupported size: " << size << std::endl;
        std::cerr << "Valid sizes: 8, 16, 32, 64, 128, 256, 512, 1024" << std::endl;
        std::exit(EXIT_FAILURE);
    }
}


int main(int argc, char *argv[]) {
    int size;
    parse_args(argc, argv, size);
    constexpr int thread_num = 32;
    float *src = nullptr, *dst = nullptr;
    cudaStream_t stream;
    CHECK_CUDA_ERROR(cudaStreamCreate(&stream));
    
    return SIZE_SWITCH(size, size_static, [&] {
        constexpr int width = size_static;
        constexpr int height = size_static;
        prepare<width, height, thread_num>(&src, &dst);
        
        // Run all flavors for the given size
        run_all_flavors<width, height, thread_num>(src, dst, stream);
        
        printf("All tests completed for size %dx%d\n", width, height);
        CHECK_CUDA_ERROR(cudaStreamDestroy(stream));
        return 0;
    });
}